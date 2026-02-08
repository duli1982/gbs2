import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')

        # Go to the local HTML file
        await page.goto(f'file://{file_path}')

        # Click the "Replay Onboarding Tour" button to start the tour
        await page.click('#replay-tour-btn')

        # Wait for the tour to become active and check the first step
        await expect(page.locator('.tour-popover-title')).to_have_text("Welcome to the Learning Hub!")

        # Define the titles of the steps we need to click through
        steps_to_click = [
            "Universal Search",
            "GBS AI Prompts Library",
            "Daily Sourcing Focus",
            "AI Success Stories"
        ]

        # Loop through the steps, clicking next and verifying the title
        for i, step_title in enumerate(steps_to_click):
            print(f"Clicking Next to go to step {i+2}: {step_title}")
            # Use force click to ensure it registers even if something is overlapping
            await page.locator('.tour-btn-next').click(force=True)
            await expect(page.locator('.tour-popover-title')).to_have_text(step_title, timeout=10000)

        print("Successfully navigated to the 'AI Success Stories' step.")

        # Take a screenshot
        screenshot_path = 'jules-scratch/verification/verification.png'
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
