import httpx
import os

SCRAPER_BASE = os.getenv("SCRAPER_URL", "http://localhost:3001")
HEADERS = {
    "X-Internal-Key": os.getenv("INTERNAL_API_KEY", ""),
    "Content-Type": "application/json",
}


async def get_transactions(from_date: str, to_date: str, page: int = 1) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{SCRAPER_BASE}/api/transactions",
            params={"from": from_date, "to": to_date, "page": page},
            headers=HEADERS,
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()


async def get_pension_projections(profile_id: str, years_ahead: int = 10) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{SCRAPER_BASE}/api/pension/profiles/{profile_id}/projections",
            params={"years_ahead": years_ahead},
            headers=HEADERS,
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json()


async def get_institutions() -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SCRAPER_BASE}/api/institutions", headers=HEADERS, timeout=10.0)
        r.raise_for_status()
        return r.json()


async def trigger_scrape(institution_id: str) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{SCRAPER_BASE}/api/scrape/{institution_id}",
            headers=HEADERS,
            timeout=120.0,
        )
        r.raise_for_status()
        return r.json()


async def get_monthly_summary(year: int, month: int) -> dict:
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{SCRAPER_BASE}/api/transactions/summary",
            params={"year": year, "month": month},
            headers=HEADERS,
            timeout=10.0,
        )
        r.raise_for_status()
        return r.json()
