# RPO Training Pathway Pages

This document outlines the structure of the role-based training pathway pages and provides instructions for maintaining and extending them.

## Page Structure

Each pathway page (e.g., `recruiter.html`, `manager.html`) is built from a consistent HTML template to ensure a uniform look and feel across the site. The key components of this template are:

- **Shared Header:** The header is consistent with the main RPO Training Hub and provides a "Back to Hub" link.
- **Breadcrumb Navigation:** Allows users to easily navigate back to the main Training Hub.
- **Pathway Header:** A large, descriptive header that clearly identifies the learning pathway.
- **Core Modules Section:** A grid of cards showcasing the key learning modules for the specific role.
- **Learning Objectives Section:** A bulleted list detailing the skills and knowledge a user will gain.
- **Tools & Resources Section:** Links to role-specific resources like cheat sheets, templates, and prompt libraries.
- **Shared Footer & Scripts:** The standard site footer and JavaScript files for features like the "Back to Top" button are loaded dynamically.

## Styling

The pages are styled using a combination of:

1.  **Tailwind CSS:** For utility-first styling and responsive design.
2.  **Shared Stylesheets:** Located in `/shared/`, these files provide consistent typography (`fonts.css`), button styles (`buttons.css`), and other common elements.
3.  **Pathway-Specific Stylesheet:** `rpo-training/pathways/css/pathways.css` contains styles specific to the pathway pages, such as the page header and module card customizations.

## How to Add a New Pathway Page

To add a new role-based pathway page (e.g., "Sourcer"), follow these steps:

1.  **Create a New HTML File:** Create a new `.html` file in the `rpo-training/pathways/` directory (e.g., `sourcer.html`).
2.  **Copy an Existing Page:** Copy the entire content of an existing pathway page (like `recruiter.html`) into your new file. This will serve as your template.
3.  **Update the Head Section:**
    -   Change the `<title>` to reflect the new role (e.g., "Sourcer Pathway - RPO AI Acceleration").
4.  **Update Breadcrumb Navigation:**
    -   Modify the breadcrumb text to match the new role (e.g., `<span>Sourcer Pathway</span>`).
5.  **Customize the Page Content:**
    -   **Pathway Header:** Update the `<h1>` and the descriptive paragraph for the new role.
    -   **Core Modules:** Change the titles, descriptions, and color highlights (`text-green-600`, `text-blue-600`, etc.) for the modules.
    -   **Learning Objectives:** Write new objectives tailored to the sourcer role.
    -   **Tools & Resources:** Update the resource links and descriptions.
6.  **Link from the Main Page:**
    -   Open `rpo-training/index.html`.
    -   Add a new button in the "Role-Specific Learning Tracks" section that links to your new page (e.g., `onclick="startRolePath('sourcer')"`).
    -   Update the `startRolePath` function in `rpo-training/index.html` to include a case for the new role, directing it to your new file (`case 'sourcer': window.location.href = 'pathways/sourcer.html'; break;`).

## Maintaining Consistency

-   **Use the Template:** Always start new pages by copying an existing one to ensure all necessary CSS and JS files are included.
-   **Leverage Existing Styles:** Before writing new CSS, check if Tailwind CSS or the shared stylesheets already provide the style you need.
-   **Follow the Structure:** Maintain the existing content structure (Header, Modules, Objectives, Resources) to ensure a consistent user experience.
-   **Keep Content Concise:** Use clear and concise language for all titles, descriptions, and objectives.