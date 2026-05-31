import { getDB, schema, eq, sql } from "@openvideo/db";

export function getDb() {
  return getDB();
}

export { schema, eq, sql };
