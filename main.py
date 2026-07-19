"""Local utility script + minimal WSGI app export for Vercel compatibility.

This file intentionally avoids running side effects at import time.
"""


def app(environ, start_response):
    """Minimal WSGI callable so Python auto-detection does not fail on Vercel."""
    body = b"OK"
    start_response(
        "200 OK",
        [("Content-Type", "text/plain; charset=utf-8"), ("Content-Length", str(len(body)))],
    )
    return [body]


def run_anthropic_hello():
    import os
    from dotenv import load_dotenv
    from anthropic import Anthropic

    load_dotenv()
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Say hello in one sentence."}],
    )
    print(response.content[0].text)


if __name__ == "__main__":
    run_anthropic_hello()
