# Nagor Rentals - System Presentation Script

## 1. Preparation (Before you start)
- **Browser**: Use Chrome or Edge. Press `F11` for Full Screen mode for a professional look.
- **Data**: The system expects some initial data. If things look empty, don't panic. The system auto-seeds data on first load.
- **Offline Mode**: You can mention this as a feature. "The system works even if internet connection is lost."

## 2. Login Demonstration
**Credentials to use:**
- **Username**: `louis`
- **Password**: `Quekubrymiz@23`
*(Note: This is the 'Super Admin' account that sees everything)*

**Talk Track:**
> "We start with a secure, branded login portal. This isn't just a generic entry point; it's designed to reflect the premium Nagor brand identity immediately."
> "The system supports multiple roles (Admin, Manager, Finance, Sales), ensuring staff only see what they need to see."

## 3. The Dashboard (Command Center)
**Action**: Log in. Land on Dashboard.
**Highlight:**
- **KPI Cards**: Show the Revenue, Active Rents, and Inventory Health.
- **Visuals**: Point out the "Glass UI" aesthetic—modern, clean, and premium.
- **Recent Activity**: Scroll down to show the live feed of actions.

**Talk Track:**
> "This is the Mission Control showing real-time business health. We can instantly see what's rented, what's available, and our financial pulse for the day."

## 4. Inventory Showcase
**Action**: Click "Inventory" in the sidebar.
**Highlight:**
- **Images**: Show that items have high-quality photos (Chairs, Tents, etc.).
- **Tabs**: Click on the new categories: **Tableware**, **Catering**, **Electronics**.
- **Search**: Type "Chair" in the search bar to show instant filtering.

**Talk Track:**
> "Our digital showroom. It's not just a list; it's a visual portfolio. We can categorize items specifically for our diverse stock—from heavy duty Marquees to delicate Crystal Centerpieces."

## 5. Booking Workflow (The Core Feature)
**Action**: Click "Bookings" -> "New Reservation".
**Steps to Demo:**
1.  **Select Partner**: Choose a customer (e.g., "Kwame Mensah").
2.  **Dates**: Pick a generic range (e.g., Today to +3 days). Point out the "Total Duration" auto-calculation.
3.  **Add Items**: Add a few "White Chiavari Chairs" and a "Marquee Tent".
    *   *Notice the "Pro Forma Invoice" on the right updating in real-time.*
4.  **Confirm**: Click "Process Dispatch Request".

**Talk Track:**
> "This is where we win time. Instead of calculators and paper, the system generates a Pro Forma invoice instantly as we add items. It checks stock availability automatically to prevent over-booking."

## 6. Receipt & Finance Logic
**Action**:
1.  Find the booking you just created in the list.
2.  Click the **Printer Icon** button.
3.  Show the **Invoice** view.
    *   Point out the "Base Rental Cost".
    *   Point out that "Balance Due" is calculated automatically.
4.  (Optional) Close print view, click "Deposit" button on the booking line.
5.  Add a partial payment (e.g., 500).
6.  Open Print view again.
    *   Show "Amount Paid" and updated "Balance Due".

**Talk Track:**
> "We generate professional, trusted financial documents. Whether it's a Waybill for the driver or a Financial Invoice for the client, it's one click away."

## 7. Handling Issues (Loss/Damage) - *Optional Advanced Demo*
**Action**:
1.  Click "Pick Up" on your booking to make it ACTIVE.
2.  Click "Loss/Damage".
3.  Enter a penalty (e.g., 200).
4.  Show the receipt again.
    *   **Verified Feature**: The receipt will nicely separate the Rental Cost from the Penalty Fee.

## 8. Closing
**Talk Track:**
> "This system is built to scale with Nagor. It runs offline, handles complex pricing logic, and presents a face to the client that is as professional as the events we organize."

---
**Technical Note for Q&A:**
- **"Where is the data?"**: Currently stored securely on the device (Local Encrypted Storage). We are ready to switch to Cloud (Supabase) immediately after approval.
