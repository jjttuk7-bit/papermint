import logging
import os

import requests

logger = logging.getLogger("hf_papers_agent")


# ── 저수준 전송 ───────────────────────────────────────────────────────────────

def _send_discord(message: str) -> None:
    url = os.getenv("DISCORD_WEBHOOK")
    if not url:
        return
    try:
        resp = requests.post(url, json={"content": message}, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Discord 알림 전송 실패: {e}")


def _send_slack(message: str) -> None:
    url = os.getenv("SLACK_WEBHOOK")
    if not url:
        return
    try:
        resp = requests.post(url, json={"text": message}, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Slack 알림 전송 실패: {e}")


def _send_email(subject: str, body: str) -> None:
    """Buttondown API로 구독자 전체에게 이메일 발송."""
    api_key = os.getenv("BUTTONDOWN_API_KEY")
    if not api_key:
        return
    try:
        resp = requests.post(
            "https://api.buttondown.email/v1/emails",
            headers={"Authorization": f"Token {api_key}"},
            json={"subject": subject, "body": body, "status": "sent"},
            timeout=15,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"이메일 전송 실패: {e}")


# ── 시나리오별 알림 ───────────────────────────────────────────────────────────

def notify_success(date: str, count: int, cost: float) -> None:
    """파이프라인 성공: Discord + Slack."""
    msg = f"✅ {date}: {count}편 처리 완료 (${cost:.2f})"
    _send_discord(msg)
    _send_slack(msg)


def notify_partial(date: str, success: int, total: int, fallback: int) -> None:
    """일부 영문 fallback 발생: Discord + Slack."""
    msg = f"⚠️ {date}: {success}/{total}편 성공, {fallback}편 영문 fallback"
    _send_discord(msg)
    _send_slack(msg)


def notify_failure(date: str, error_msg: str) -> None:
    """파이프라인 전체 실패: Discord + 이메일."""
    short = error_msg[:200] if error_msg else "알 수 없는 오류"
    msg = f"❌ {date}: 실행 실패 — {short}"
    _send_discord(msg)
    _send_slack(msg)
    _send_email(
        subject=f"[papermint] {date} 파이프라인 실패",
        body=f"파이프라인이 실패했습니다.\n\n날짜: {date}\n오류: {error_msg}",
    )


def notify_cost_alert(date: str, cost: float, threshold: float) -> None:
    """일일 비용 임계값 초과: 이메일."""
    _send_email(
        subject=f"[papermint] 💰 {date} LLM 비용 초과 ${cost:.2f}",
        body=(
            f"일일 LLM API 비용이 임계값(${threshold:.2f})을 초과했습니다.\n\n"
            f"날짜: {date}\n실제 비용: ${cost:.2f}\n임계값: ${threshold:.2f}"
        ),
    )


def notify_json_failures(date: str, count: int) -> None:
    """JSON 파싱 실패 3건 이상: Discord."""
    msg = f"🔧 {date}: JSON 파싱 실패 {count}건 이상 — 프롬프트 점검 필요"
    _send_discord(msg)
    _send_slack(msg)
