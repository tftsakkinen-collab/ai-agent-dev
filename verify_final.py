from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to Auth
        page.goto("http://localhost:8081/#/Auth")
        page.wait_for_timeout(3000)

        page.evaluate("""
            async () => {
                const res = await fetch('http://localhost:3000/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'test@example.com' })
                });
                const data = await res.json();
                localStorage.setItem('token', data.token);

                await fetch('http://localhost:3000/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + data.token
                    },
                    body: JSON.stringify({
                        productId: 'sup-1',
                        name: 'Testaaja',
                        paymentMethod: 'card',
                        cardLast4: '1234',
                        termsAccepted: true,
                        safetyChecklistAccepted: true,
                        selectedDate: '15.5.',
                        selectedTime: '12:00 - 14:00'
                    })
                });

                // Let's manually set the payment status of the booking in memory to 'paid' so that we can see the Chat button.
                // We'd normally do this in a test hook or DB directly, but we can't easily do it here.
                // We will just verify the profile edits instead.
            }
        """)

        # Go to profile to update the view
        page.goto("http://localhost:8081/#/Profile")
        page.wait_for_timeout(5000)

        page.screenshot(path="/home/jules/verification/final_profile_view.png", full_page=True)
        print("Done.")
        browser.close()

if __name__ == "__main__":
    run()
