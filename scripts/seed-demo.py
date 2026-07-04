#!/usr/bin/env python3
"""Nabani demo seed — drives the full flujo maestro through the live API on :4040."""
import json, urllib.request, urllib.error, datetime, sys

BASE = "http://localhost:4040/api"
TODAY = datetime.date.today().isoformat()

def req(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "null")

def must(status, body, what):
    if status >= 300:
        print(f"  ✗ {what}: {status} {json.dumps(body)[:300]}"); sys.exit(1)
    return body

# --- login ---
st, b = req("POST", "/auth/login", body={"username":"admin@nabani.app","password":"nabani123"})
TOKEN = must(st, b, "login")["token"]
print(f"logged in; today={TODAY}")

# --- idempotency guard ---
st, b = req("GET", "/patients?limit=1", TOKEN)
if b.get("count", 0) > 0:
    print(f"already seeded ({b['count']} patients) — skipping."); sys.exit(0)

# --- reference maps ---
levels = {r["kcal"]: r["id"] for r in must(*req("GET","/calorie-levels",TOKEN), "levels")["rows"]}
diseases = {r["key"]: r["id"] for r in must(*req("GET","/diseases",TOKEN), "diseases")["rows"]}
LV = sorted(levels)  # [1300,1700,2000,2200,2500]
print(f"levels={list(levels)} diseases={len(diseases)}")

def portions(vals):  # vals aligned to LV order
    return [{"calorieLevelId": levels[k], "portions": v} for k, v in zip(LV, vals)]

# --- ingredients ---
ING = [
    ("Avena","cereal","gr",40,[]), ("Huevo","otros","pzas",2,[]),
    ("Manzana","fruta","gr",150,[]), ("Espinaca","verdura","gr",100,[]),
    ("Pollo","otros","gr",120,[]), ("Arroz integral","cereal","gr",60,[]),
    ("Queso panela","lacteo","gr",30,[]), ("Jamón de pavo","otros","gr",40,["hipertension"]),
    ("Zanahoria","verdura","gr",80,[]), ("Yogurt natural","lacteo","ml",150,["diabetes"]),
    ("Almendras","otros","gr",20,[]), ("Pescado","otros","gr",120,[]),
    ("Tortilla de maíz","cereal","pzas",2,[]), ("Aguacate","otros","gr",50,[]),
    ("Lechuga","verdura","gr",60,[]),
]
ing = {}
for name, fg, unit, qty, dis in ING:
    body = {"name":name,"foodGroup":fg,"baseUnit":unit,"baseQuantity":qty,
            "diseaseIds":[diseases[d] for d in dis]}
    ing[name] = must(*req("POST","/ingredients",TOKEN,body), f"ing {name}")["id"]
print(f"ingredients: {len(ing)}")

def di(name, qty, unit, pos, pvals):
    return {"ingredientId":ing[name],"baseQuantity":qty,"unit":unit,"position":pos,"portions":portions(pvals)}

# --- dishes ---
DISHES = [
 ("Tortitas de avena con manzana","desayuno",[di("Avena",40,"gr",0,[1,1.5,2,2,2.5]),di("Huevo",2,"pzas",1,[1,1,2,2,2]),di("Manzana",150,"gr",2,[1,1,1,1.5,1.5])]),
 ("Omelette de espinaca","desayuno",[di("Huevo",2,"pzas",0,[2,2,3,3,3]),di("Espinaca",100,"gr",1,[1,1,1.5,2,2]),di("Queso panela",30,"gr",2,[1,1,1,1,1.5])]),
 ("Pollo a la plancha con arroz","comida",[di("Pollo",120,"gr",0,[1,1.5,2,2,2.5]),di("Arroz integral",60,"gr",1,[1,1.5,2,2,2]),di("Zanahoria",80,"gr",2,[1,1,1,1,1]),di("Lechuga",60,"gr",3,[1,1,1,1,1])]),
 ("Pescado zarandeado con verduras","comida",[di("Pescado",120,"gr",0,[1,1.5,2,2,2.5]),di("Espinaca",100,"gr",1,[1,1,1.5,2,2]),di("Zanahoria",80,"gr",2,[1,1,1,1.5,1.5]),di("Aguacate",50,"gr",3,[0.5,1,1,1,1])]),
 ("Yogurt con almendras","snack",[di("Yogurt natural",150,"ml",0,[1,1,1,1,1]),di("Almendras",20,"gr",1,[1,1,1,1.5,2]),di("Manzana",150,"gr",2,[0.5,1,1,1,1])]),
 ("Tacos de jamón y aguacate","cena",[di("Tortilla de maíz",2,"pzas",0,[1,2,2,2,3]),di("Jamón de pavo",40,"gr",1,[1,1,1.5,2,2]),di("Aguacate",50,"gr",2,[0.5,0.5,1,1,1]),di("Lechuga",60,"gr",3,[1,1,1,1,1])]),
]
dish = {}
for name, mt, ings in DISHES:
    dish[name] = must(*req("POST","/dishes",TOKEN,{"name":name,"mealTime":mt,"ingredients":ings}), f"dish {name}")["id"]
print(f"dishes: {len(dish)}")

# --- packages ---
def pk(label, code, price, md, d, s1, c, s2, ce):
    body={"displayLabel":label,"code":code,"pricePerDay":price,"consultPrice":600,"monthDiscount":md,
          "includesDesayuno":d,"includesSnack1":s1,"includesComida":c,"includesSnack2":s2,"includesCena":ce}
    return must(*req("POST","/packages",TOKEN,body), f"pkg {label}")["id"]
pkg = {
 "completo": pk("Completo Mensual","DCCe",260,10,True,False,True,False,True),
 "full":     pk("Full Mensual","DS1CS2Ce",320,10,True,True,True,True,True),
 "basico":   pk("Básico Mensual","DC",200,10,True,False,True,False,False),
}
print(f"packages: {len(pkg)}")

# --- patients (week LV skips Sat+Sun, LS skips Sun, LD every day; today is used as startDate) ---
def plan(kcal): return {"calorieLevelId":levels[kcal],"verduras":5,"frutas":5,"cereales":8,"lacteos":2,
    "pDesayuno":3,"pComida":5,"pCena":3,"aceites":2,"semillas":3}
PATIENTS = [
 # name, kcal, week, package, diseaseKeys, prefIngredientNames, zone
 ("Marjorie","Córdova",1700,"LV","completo",[],[],"Centro"),
 ("Luz","Hernández",1300,"LS","completo",["diabetes"],[],"Reforma"),        # yogurt → disease(blue)
 ("Tomás","González",2000,"LD","full",["hipertension"],["Espinaca"],"Xoxo"),# jamón→disease, espinaca→pref(amber)
 ("Ana","López",2200,"LS","full",[],["Manzana"],"Santa Lucía"),
 ("Carlos","Ruiz",1700,"LD","basico",[],[],"Centro"),
 ("Sofía","Díaz",2500,"LD","full",["colitis"],[],"San Felipe"),
]
patients = []
for fn, ln, kcal, week, pkkey, dis, prefs, zone in PATIENTS:
    body = {"firstName":fn,"lastName":ln,"email":f"{fn.lower()}@correo.mx","cellphone":"9511234567",
            "gender":"F" if fn in ("Marjorie","Luz","Ana","Sofía") else "M","week":week,"zone":zone,
            "tuppers":True,"calorieLevelId":levels[kcal],"nutritionPlan":plan(kcal),
            "diseaseIds":[diseases[d] for d in dis],
            "preferenceIngredientIds":[ing[p] for p in prefs],
            "address":{"street":"Av. Juárez 100","neighborhood":zone,"zipCode":"68000","city":"Oaxaca","state":"Oaxaca"}}
    p = must(*req("POST","/patients",TOKEN,body), f"patient {fn}")
    patients.append((p["id"], week, pkkey, f"{fn} {ln}"))
print(f"patients: {len(patients)}")

# --- sales + delivery-day generation ---
DAYS = {"LV":20,"LS":24,"LD":28}
for pid, week, pkkey, name in patients:
    body={"patientId":pid,"packageId":pkg[pkkey],"startDate":TODAY,"days":DAYS[week],"billing":"mensual"}
    st,b = req("POST","/sales/calculate-package-and-days",TOKEN,body)
    if st>=300: print(f"  ✗ sale {name}: {st} {json.dumps(b)[:200]}")
    else:
        pr=b.get("pricing",{}); print(f"  sale {name}: total={pr.get('total')} installments={pr.get('installmentCount')} deliveries={len(b.get('sale',{}).get('deliveries',[]))}")

# --- menu del día for today ---
meals=[{"mealSlot":"desayuno","dishId":dish["Tortitas de avena con manzana"],"position":0},
       {"mealSlot":"colacion1","dishId":dish["Yogurt con almendras"],"position":1},
       {"mealSlot":"comida","dishId":dish["Pollo a la plancha con arroz"],"position":2},
       {"mealSlot":"colacion2","dishId":dish["Yogurt con almendras"],"position":3},
       {"mealSlot":"cena","dishId":dish["Tacos de jamón y aguacate"],"position":4}]
md = must(*req("POST","/menu-days",TOKEN,{"menuDate":TODAY,"status":"completo","meals":meals}), "menu-day")
print(f"menu-day {TODAY}: {md['id']}")

# --- apply to patients with a delivery today ---
st,b = req("POST","/apply-menu-to-patients",TOKEN,{"date":TODAY})
print(f"apply-menu: {st} {json.dumps(b)[:300]}")

# --- verify aggregations ---
print("=== VERIFY ===")
for path in [f"/dashboard/today?date={TODAY}", f"/adjustments?date={TODAY}", f"/production-map?date={TODAY}"]:
    st,b = req("GET", path, TOKEN)
    if "dashboard" in path: print(f"  dashboard: {json.dumps(b.get('metrics'))} pipeline.ajustes={json.dumps(b.get('pipeline',{}).get('ajustes'))}")
    elif "adjustments" in path: print(f"  adjustments: summary={json.dumps(b.get('summary'))} rows={len(b.get('rows',[]))}")
    elif "production-map" in path: print(f"  production-map: patients={b.get('patientCount')} columns={len(b.get('columns',[]))} totals={len(b.get('totalsForKitchen',[]))}")
print("SEED DONE ✓")
