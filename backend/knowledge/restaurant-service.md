# Restaurant service overview

This restaurant platform keeps menu, orders, reservations, tables, and restaurant details in its own database. The virtual waitress uses live backend tools for questions about current menu availability and reservations. It does not rely on a cached copy for prices or availability.

Customers can ask the assistant to recommend dishes, check whether a table appears available for a date and time, and prepare an order or reservation draft. Menu prices and item availability in a draft come from the restaurant's current menu at the time the draft is prepared.

Table availability is based on the configured table count, active orders, and confirmed reservations. A confirmed reservation occupies its table for that service day under the restaurant's current booking convention. The assistant cannot guarantee a table until the restaurant confirms the reservation.

Orders are submitted only after the customer reviews the draft and explicitly confirms it. The backend rechecks item availability, current prices, table occupancy, and business rules before creating the order.

The platform stores a payment method label (cash or card) but does not process card payments. Customers should not send card numbers, passwords, or other secrets through the chat.

# Ordering and reservation requests

To prepare an order, the assistant needs the menu item choices, quantities, and a table number. The order draft shows the current price of each item and the total. Submitting the order is a separate confirmation step performed by the customer in the interface, never by the assistant itself.

To prepare a reservation, the assistant needs the party size, the requested date, and the requested time. The signed-in customer's name and email are used for the reservation. A contact phone number is also required; if the account has no phone number, the customer is asked for one. The assistant checks availability before preparing the draft.

Availability results are estimates based on stored data and the restaurant's current booking convention. They are not a guarantee. If the requested time is not available, the assistant can suggest checking a different time or party size.

The assistant can only create actions for the signed-in customer. It cannot view another customer's orders or reservations, change staff statuses, or access management logs and internal settings.

# Assistant limitations and missing data

The menu database does not contain dietary labels, allergen information, ingredient lists, or preparation details. The assistant must not infer that a dish is vegetarian, vegan, gluten-free, or allergen-safe from its name or description. It should say that this information is not recorded and suggest confirming with restaurant staff.

The restaurant settings database does not contain opening hours, holiday closures, or seating durations. The assistant must not invent them. If opening hours matter, it should say that the information is not available in the system and direct the customer to the restaurant's published contact details.

The restaurant settings database also does not contain per-table seating capacity. Availability checks use the total table count and existing bookings; they cannot verify that a specific table fits a large party. Large or accessible-seating requests should be confirmed with staff.

If the AI service, embedding service, or knowledge base is unavailable, the assistant should say so plainly rather than guessing. Unsupported questions should receive an honest "I don't have that information" answer.
