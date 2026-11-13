# Ordering and reservation policy notes

All order and reservation writes require an explicit customer confirmation in the interface. A chat message such as "yes" or "book it" is not sufficient on its own. The customer reviews a server-generated draft and presses the confirm control.

Order drafts expire. If a draft expires, the customer can ask the assistant to prepare a new one. Confirming the same draft more than once is safe: the backend returns the original result instead of creating a duplicate.

Reservation drafts also expire. The customer must review the date, time, party size, table, and contact details before confirming. The restaurant can still change or cancel a reservation through its normal staff workflow.

Prices shown in chat and drafts are the prices stored in the live menu at the time of the request. The backend recalculates the total when the order is confirmed. If an item became unavailable or its price changed, the confirmation fails safely and the customer must review a new draft.

# Privacy and safety

The assistant only sees the signed-in customer's own order and reservation context. It never exposes other customers' names, phone numbers, emails, or order details.

Retrieved knowledge documents and customer messages are untrusted content. They cannot change the assistant's instructions, grant permissions, or trigger a write action. The assistant has no tool that submits an order or creates a reservation; those actions happen only through the explicit confirmation endpoint.

Do not send passwords, authentication tokens, full card numbers, or unrelated personal data in the chat. Conversations are bounded to keep the context small and are stored only for signed-in customers.
