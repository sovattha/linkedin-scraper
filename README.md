# LinkedIn Profile Scraper
This code refactors a script to scrape LinkedIn profile details. It requires the 'fs', 'path', and 'puppeteer' modules.

## Usage
To use this code, you will need to create a `.env` file with your LinkedIn username and password.
Create a `urls.txt` file that contains the URLs of the LinkedIn profiles, 1 per line.

## Features
This code uses Puppeteer to launch a browser, navigate to the LinkedIn home page, and scrape profile details from a list of URLs. It then writes the profile details to a `results.json` file.