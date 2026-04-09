from fastapi.responses import JSONResponse
from datetime import datetime
r = JSONResponse(content={'a': datetime.now()})
print(type(r.body), r.body)
