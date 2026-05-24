"""classics.yml의 arxiv_id 일괄 검증.

HF Papers API에 존재하는지 확인하고, 없으면 arxiv.org abs URL로 ID 자체 유효성 확인.
결과: ok / arxiv_only(HF에 없음, arxiv에는 존재) / broken(arxiv도 404).
"""

import asyncio
import sys
from pathlib import Path

import httpx
import yaml

HF_API = "https://huggingface.co/api/papers/{}"
ARXIV_ABS = "https://arxiv.org/abs/{}"
CONCURRENCY = 8
TIMEOUT = 15.0


async def check_one(client: httpx.AsyncClient, sem: asyncio.Semaphore, slot: str, arxiv_id: str) -> dict:
    async with sem:
        result = {"slot": slot, "arxiv_id": arxiv_id, "hf": None, "arxiv": None, "status": None}
        try:
            r = await client.get(HF_API.format(arxiv_id), timeout=TIMEOUT)
            result["hf"] = r.status_code
            if r.status_code == 200:
                result["status"] = "ok"
                return result
        except Exception as e:
            result["hf"] = f"err:{type(e).__name__}"

        try:
            r = await client.head(ARXIV_ABS.format(arxiv_id), timeout=TIMEOUT, follow_redirects=True)
            result["arxiv"] = r.status_code
            if r.status_code == 200:
                result["status"] = "arxiv_only"
            else:
                result["status"] = "broken"
        except Exception as e:
            result["arxiv"] = f"err:{type(e).__name__}"
            result["status"] = "broken"

        return result


async def main():
    path = Path(__file__).resolve().parents[1] / "config" / "classics.yml"
    data = yaml.safe_load(path.read_text(encoding="utf-8"))

    jobs = []
    for slot in ("foundation", "vision", "language"):
        for aid in data.get(slot, []):
            jobs.append((slot, str(aid)))

    print(f"총 {len(jobs)}개 ID 검증 시작 (동시성 {CONCURRENCY})\n")

    sem = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[check_one(client, sem, s, a) for s, a in jobs])

    by_status = {"ok": [], "arxiv_only": [], "broken": []}
    for r in results:
        by_status[r["status"]].append(r)

    print(f"=== 요약 ===")
    print(f"  ok         : {len(by_status['ok'])}")
    print(f"  arxiv_only : {len(by_status['arxiv_only'])}  (HF Papers 미등재, arxiv에는 존재)")
    print(f"  broken     : {len(by_status['broken'])}  (arxiv도 404 → ID 의심)")
    print()

    if by_status["arxiv_only"]:
        print("[arxiv_only — HF Papers에 없음. fetcher가 메타를 못 가져올 수 있음]")
        for r in by_status["arxiv_only"]:
            print(f"  {r['slot']:11s} {r['arxiv_id']}  (HF {r['hf']})")
        print()

    if by_status["broken"]:
        print("[broken — arxiv ID 자체 의심. 교체 필요]")
        for r in by_status["broken"]:
            print(f"  {r['slot']:11s} {r['arxiv_id']}  (HF {r['hf']}, arxiv {r['arxiv']})")
        print()

    exit_code = 1 if by_status["broken"] else 0
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
