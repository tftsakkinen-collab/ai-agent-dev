from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.goto("http://localhost:8081/#/AdminOps")
        page.wait_for_timeout(5000)

        page.screenshot(path="/home/jules/verification/admin_panel.png", full_page=True)
        print("Screenshot taken.")
        browser.close()

if __name__ == "__main__":
    run()
