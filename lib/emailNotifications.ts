import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM = `"Das Auto Spa" <${process.env.GMAIL_USER}>`;

async function send(to: string | string[], subject: string, html: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (e) {
    console.error("[email] Failed:", subject, e);
  }
}

function shell(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
<tr><td style="background:#111111;padding:24px 32px;">
  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Das Auto Spa</p>
  <p style="margin:4px 0 0;color:#888888;font-size:12px;">Door-to-Door Car Wash</p>
</td></tr>
<tr><td style="padding:28px 32px 0;">
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#111111;letter-spacing:-0.3px;">${title}</h1>
</td></tr>
<tr><td style="padding:16px 32px 32px;">${body}</td></tr>
<tr><td style="background:#f9f9f9;padding:14px 32px;border-top:1px solid #eeeeee;">
  <p style="margin:0;font-size:11px;color:#aaaaaa;">Automated notification from Das Auto Spa. Do not reply to this email.</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
      <p style="margin:0 0 2px;font-size:11px;color:#999999;text-transform:uppercase;font-weight:600;letter-spacing:0.5px;">${label}</p>
      <p style="margin:0;font-size:14px;color:#333333;font-weight:500;">${value}</p>
    </td>
  </tr>`;
}

function table(rows: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">${rows}</table>`;
}

function note(text: string): string {
  return `<p style="margin:20px 0 0;font-size:12px;color:#aaaaaa;">${text}</p>`;
}

// 1. New booking → admins
export async function emailNewBookingToAdmins(adminEmails: string[], b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; amount: number;
}) {
  const html = shell("New Booking Received", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A new booking has been placed and needs a provider assigned.</p>
    ${table(row("Booking ID", b.bookingId) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Amount", `RM ${b.amount}`))}
    ${note("Log in to the admin panel to assign a service provider.")}
  `);
  await send(adminEmails, `New Booking — ${b.serviceName} on ${b.scheduledDate}`, html);
}

// 2. Booking confirmation → customer
export async function emailBookingConfirmation(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; address: string; bookingId: string; amount: number;
}) {
  const html = shell("Booking Confirmed!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your booking is confirmed. Here are your details:</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Location", b.address) + row("Amount", `RM ${b.amount}`))}
    ${note("We'll notify you once a service provider has been assigned.")}
  `);
  await send(customerEmail, `Booking Confirmed — ${b.bookingId}`, html);
}

// 3. Provider assigned → customer
export async function emailProviderAssignedToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string;
}) {
  const html = shell("Provider Assigned!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, a service provider has been assigned to your booking.</p>
    ${table(row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot))}
    ${note("You'll receive another update when your provider is on the way.")}
  `);
  await send(customerEmail, `Provider Assigned — ${b.serviceName} on ${b.scheduledDate}`, html);
}

// 4. Job assigned → provider
export async function emailJobAssignedToProvider(providerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; address: string; bookingId: string;
}) {
  const html = shell("New Job Assigned!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">You have been assigned a new job. Here are the details:</p>
    ${table(row("Booking ID", b.bookingId) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Location", b.address))}
    ${note("Log in to the provider portal to manage this job.")}
  `);
  await send(providerEmail, `New Job — ${b.serviceName} on ${b.scheduledDate}`, html);
}

// 5. Status update → customer
export async function emailStatusUpdateToCustomer(customerEmail: string, status: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; bookingId: string;
}) {
  const msgs: Record<string, { title: string; body: string }> = {
    "En Route":           { title: "Your Provider Is On The Way!",        body: `Your service provider is heading to your location for the <strong>${b.serviceName}</strong> service on ${b.scheduledDate}.` },
    "In Progress":        { title: "Service In Progress",                  body: `Your <strong>${b.serviceName}</strong> is now being carried out. Sit back and relax!` },
    "Completion Pending": { title: "Service Done — Awaiting Confirmation", body: `Your <strong>${b.serviceName}</strong> has been completed and is awaiting final confirmation from admin.` },
    "Completed":          { title: "Service Confirmed Complete!",          body: `Your <strong>${b.serviceName}</strong> has been confirmed complete. Thank you for choosing Das Auto Spa! Don't forget to leave a review.` },
    "Cancelled":          { title: "Booking Cancelled",                    body: `Your <strong>${b.serviceName}</strong> booking on ${b.scheduledDate} has been cancelled.` },
    "Issue/Delayed":      { title: "Service Update — Issue Reported",      body: `There is an issue or delay with your <strong>${b.serviceName}</strong> booking. Our team is looking into it and will update you shortly.` },
  };
  const msg = msgs[status];
  if (!msg) return;
  const html = shell(msg.title, `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName},</p>
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">${msg.body}</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate))}
  `);
  await send(customerEmail, `${msg.title} — ${b.bookingId}`, html);
}

// 6. Completion pending → admins
export async function emailCompletionPendingToAdmins(adminEmails: string[], b: {
  providerName: string; customerName: string; serviceName: string; scheduledDate: string; bookingId: string;
}) {
  const html = shell("Job Completed — Awaiting Confirmation", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A provider has marked a job as complete. Please review and confirm.</p>
    ${table(row("Booking ID", b.bookingId) + row("Provider", b.providerName) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate))}
    ${note("Log in to the admin panel to confirm the completion.")}
  `);
  await send(adminEmails, `Job Completion Pending — ${b.bookingId}`, html);
}

// 7. Issue reported → admins
export async function emailIssueReportedToAdmins(adminEmails: string[], b: {
  providerName: string; customerName: string; serviceName: string; scheduledDate: string; bookingId: string;
}) {
  const html = shell("Issue Reported on a Job", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A provider has reported an issue on an active job.</p>
    ${table(row("Booking ID", b.bookingId) + row("Provider", b.providerName) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate))}
    ${note("Log in to the admin panel to review and take action.")}
  `);
  await send(adminEmails, `Issue Reported — ${b.bookingId}`, html);
}

// 8. Online banking — booking received, payment pending → customer
export async function emailPaymentPendingToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; amount: number;
}) {
  const html = shell("Booking Received — Payment Under Review", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your booking has been received and your payment receipt is being reviewed.</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Amount", `RM ${b.amount}`) + row("Payment Status", "Pending Verification"))}
    ${note("We will notify you once your payment has been verified. This usually takes a few minutes.")}
  `);
  await send(customerEmail, `Booking Received — Payment Under Review (${b.bookingId})`, html);
}

// 9. Online banking — new booking with receipt → admins
export async function emailPendingPaymentToAdmins(adminEmails: string[], b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; amount: number;
}) {
  const html = shell("New Booking — Payment Receipt Uploaded", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A customer has submitted a booking via online banking and uploaded a payment receipt. Please verify the payment.</p>
    ${table(row("Booking ID", b.bookingId) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Amount", `RM ${b.amount}`))}
    ${note("Log in to the admin panel to view the receipt and verify the payment.")}
  `);
  await send(adminEmails, `Payment Verification Required — ${b.bookingId}`, html);
}

// 10. Payment verified → customer
export async function emailPaymentVerifiedToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; amount: number;
}) {
  const html = shell("Payment Verified — Booking Confirmed!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your payment has been verified and your booking is confirmed!</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + row("Amount", `RM ${b.amount}`) + row("Payment Status", "Paid ✓"))}
    ${note("We'll notify you once a service provider has been assigned.")}
  `);
  await send(customerEmail, `Payment Verified — Booking Confirmed (${b.bookingId})`, html);
}

// 11. Review submitted → admins (email)
export async function emailReviewToAdmins(adminEmails: string[], r: {
  customerName: string; serviceName: string; scheduledDate: string; rating: number; comment: string | null;
}) {
  const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  const html = shell("New Customer Review Received", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A customer has submitted a review for a completed service.</p>
    ${table(
      row("Customer", r.customerName) +
      row("Service", r.serviceName) +
      row("Date", r.scheduledDate) +
      row("Rating", `<span style="color:#f59e0b;font-size:16px;">${stars}</span> &nbsp;${r.rating}/5`) +
      (r.comment ? row("Comment", `"${r.comment}"`) : "")
    )}
  `);
  await send(adminEmails, `New Review — ${r.rating}/5 Stars for ${r.serviceName}`, html);
}

// 12. Leave request → admins
export async function emailLeaveRequestToAdmins(adminEmails: string[], l: {
  providerName: string; date: string; reason: string; notes?: string | null;
}) {
  const html = shell("New Leave Request", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A service provider has submitted a leave request.</p>
    ${table(
      row("Provider", l.providerName) +
      row("Date", new Date(l.date + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })) +
      row("Reason", l.reason) +
      (l.notes ? row("Notes", l.notes) : "")
    )}
    ${note("Log in to the admin panel to approve or reject this request.")}
  `);
  await send(adminEmails, `Leave Request — ${l.providerName} on ${l.date}`, html);
}

// 9. Leave approved/rejected → provider
export async function emailLeaveStatusToProvider(providerEmail: string, l: {
  providerName: string; date: string; reason: string; status: "Approved" | "Rejected"; adminNotes?: string | null;
}) {
  const approved = l.status === "Approved";
  const title = approved ? "Leave Request Approved" : "Leave Request Rejected";
  const html = shell(title, `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${l.providerName}, your leave request has been <strong>${l.status.toLowerCase()}</strong>.</p>
    ${table(
      row("Date", new Date(l.date + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })) +
      row("Reason", l.reason) +
      row("Status", l.status) +
      (!approved && l.adminNotes ? row("Admin Notes", l.adminNotes) : "")
    )}
  `);
  await send(providerEmail, `Leave Request ${l.status} — ${l.date}`, html);
}

// 13. Booking rescheduled → customer
export async function emailRescheduleToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; oldDate: string; oldTimeSlot: string; newDate: string; newTimeSlot: string; bookingId: string;
}) {
  const html = shell("Booking Rescheduled", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your booking has been rescheduled successfully.</p>
    ${table(
      row("Booking ID", b.bookingId) +
      row("Service", b.serviceName) +
      row("Previous Date", `${b.oldDate} · ${b.oldTimeSlot}`) +
      row("New Date", `${b.newDate} · ${b.newTimeSlot}`)
    )}
    ${note("If you did not make this change, please contact us immediately.")}
  `);
  await send(customerEmail, `Booking Rescheduled — ${b.bookingId}`, html);
}

// 14. Booking rescheduled → admins
export async function emailRescheduleToAdmins(adminEmails: string[], b: {
  customerName: string; serviceName: string; oldDate: string; oldTimeSlot: string; newDate: string; newTimeSlot: string; bookingId: string;
}) {
  const html = shell("Booking Rescheduled by Customer", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A customer has rescheduled their booking.</p>
    ${table(
      row("Booking ID", b.bookingId) +
      row("Customer", b.customerName) +
      row("Service", b.serviceName) +
      row("Previous Date", `${b.oldDate} · ${b.oldTimeSlot}`) +
      row("New Date", `${b.newDate} · ${b.newTimeSlot}`)
    )}
    ${note("Log in to the admin panel to review the updated schedule.")}
  `);
  await send(adminEmails, `Booking Rescheduled — ${b.bookingId}`, html);
}

// 0. Welcome email → new customer
export async function emailWelcomeToCustomer(customerEmail: string, customerName: string) {
  const html = shell("Welcome to Das Auto Spa!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${customerName}, welcome aboard! Your account has been created successfully.</p>
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">You can now book our door-to-door car wash service anytime, right from your phone or computer.</p>
    ${table(
      row("Service", "Door-to-Door Car Wash") +
      row("Coverage", "Klang Valley") +
      row("Support", "dasautospafyp@gmail.com")
    )}
    ${note("If you did not create this account, please ignore this email.")}
  `);
  await send(customerEmail, "Welcome to Das Auto Spa!", html);
}

// 15. Refund processed → customer
export async function emailRefundProcessedToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; bookingId: string;
}) {
  const html = shell("Refund Processed", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your refund has been processed successfully.</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Refund Status", "✓ Refunded"))}
    ${note("Please allow 1–3 business days for the amount to appear in your account depending on your bank.")}
  `);
  await send(customerEmail, `Refund Processed — ${b.bookingId}`, html);
}

// 16. Booking cancelled → customer
export async function emailCancellationToCustomer(customerEmail: string, b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; needsRefund: boolean;
}) {
  const refundNote = b.needsRefund
    ? `<p style="margin:16px 0 0;padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;font-size:13px;color:#92400e;">Your previous payment will be refunded. Our team will process it shortly and contact you if needed.</p>`
    : "";
  const html = shell("Booking Cancelled", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">Hi ${b.customerName}, your booking has been cancelled successfully.</p>
    ${table(row("Booking ID", b.bookingId) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot))}
    ${refundNote}
    ${note("If you did not make this change, please contact us immediately.")}
  `);
  await send(customerEmail, `Booking Cancelled — ${b.bookingId}`, html);
}

// 16. Booking cancelled → admins
export async function emailCancellationToAdmins(adminEmails: string[], b: {
  customerName: string; serviceName: string; scheduledDate: string; timeSlot: string; bookingId: string; needsRefund: boolean;
}) {
  const refundRow = b.needsRefund ? row("Action Required", "⚠️ Refund Required — customer paid via online banking") : "";
  const html = shell("Booking Cancelled by Customer", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A customer has cancelled their booking.</p>
    ${table(row("Booking ID", b.bookingId) + row("Customer", b.customerName) + row("Service", b.serviceName) + row("Date", b.scheduledDate) + row("Time", b.timeSlot) + refundRow)}
    ${note("The time slot is now available for other bookings.")}
  `);
  await send(adminEmails, `Booking Cancelled${b.needsRefund ? " — Refund Required" : ""} — ${b.bookingId}`, html);
}

// 10. Review submitted → provider
export async function emailReviewToProvider(providerEmail: string, r: {
  customerName: string; serviceName: string; scheduledDate: string; rating: number; comment: string | null;
}) {
  const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  const html = shell("A Customer Left You a Review!", `
    <p style="margin:12px 0 0;color:#555555;font-size:14px;">A customer has reviewed your recent job.</p>
    ${table(
      row("Customer", r.customerName) +
      row("Service", r.serviceName) +
      row("Date", r.scheduledDate) +
      row("Rating", `<span style="color:#f59e0b;font-size:16px;">${stars}</span> &nbsp;${r.rating}/5`) +
      (r.comment ? row("Comment", `"${r.comment}"`) : "")
    )}
  `);
  await send(providerEmail, `New Review — ${r.rating}/5 Stars for ${r.serviceName}`, html);
}
