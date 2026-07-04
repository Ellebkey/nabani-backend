#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE nabani_test;
  \c nabani_test
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL
