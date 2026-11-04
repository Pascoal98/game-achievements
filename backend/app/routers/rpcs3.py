from fastapi import APIRouter, HTTPException, Response
from app.services.rpcs3 import library as rpcs3_library

router = APIRouter(prefix="/rpcs3", tags=["rpcs3"])

_IMAGE_HEADERS = {"Cache-Control": "public, max-age=3600"}


def _png(data: bytes | None) -> Response:
    if data is None:
        raise HTTPException(status_code=404, detail="Image not found")
    return Response(content=data, media_type="image/png", headers=_IMAGE_HEADERS)


@router.get("/images/{serial}/trophies/{set_id}/{trophy_id}")
def trophy_image(serial: str, set_id: str, trophy_id: int):
    return _png(rpcs3_library.get_image(serial, "trophy", set_id, trophy_id))


@router.get("/images/{serial}/{kind}")
def game_image(serial: str, kind: str):
    return _png(rpcs3_library.get_image(serial, kind))
