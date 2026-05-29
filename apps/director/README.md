curl -X POST http://localhost:4000/auth/sign-up \
 -H "Content-Type: application/json" \
 -d '{"email":"dev@example.com","password":"password123","name":"Dev User"}'

curl -X POST http://localhost:4000/auth/sign-in \
 -H "Content-Type: application/json" \
 -d '{"email":"dev@example.com","password":"password123"}'

{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJMUUduOGUzOXNvTUQzVE55X1BVZGMiLCJlbWFpbCI6ImRldkBleGFtcGxlLmNvbSIsIm5hbWUiOiJEZXYgVXNlciIsImlhdCI6MTc3OTQ5NjI1NCwiZXhwIjoxNzgwMTAxMDU0fQ.10vQPhshXHYOvcEOea1JG0574GxslD85t0QHuthvRws","user":{"id":"LQGn8e39soMD3TNy_PUdc","email":"dev@example.com","name":"Dev User","createdAt":"2026-05-23T00:15:18.306Z"}}

curl -X POST http://localhost:4000/auth/tokens \
 -H "Authorization: Bearer eyJzdWIiOiJMUUduOGUzOXNvTUQzVE55X1BVZGMiLCJlbWFpbCI6ImRldkBleGFtcGxlLmNvbSIsIm5hbWUiOiJEZXYgVXNlciIsImlhdCI6MTc3OTQ5NjI1NCwiZXhwIjoxNzgwMTAxMDU0fQ.10vQPhshXHYOvcEOea1JG0574GxslD85t0QHuthvRws" \
 -H "Content-Type: application/json" \
 -d '{"name":"Production Server","scopes":["all"],"expiresInDays":30}'

{"token":"ov_live_nVGFfW9INmDBdd8Rwl83ZD6p","id":"Hc80ZNBZ-2Q09cPNoTuRn","name":"Production Server","hint":"...ZD6p","scopes":["all"],"expiresAt":"2026-06-22T00:32:15.664Z","createdAt":"2026-05-23T00:32:15.927Z"}
