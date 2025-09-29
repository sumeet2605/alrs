# app/services/email_service.py
import resend # type: ignore
from os import getenv

resend.api_key = getenv("RESEND_API_KEY")
SENDER_EMAIL = getenv("EMAIL_SENDER")

def send_confirmation_email(user_email: str, username: str, full_name: str | None = None):
    """
    Sends a welcome email to a newly registered user.
    Args:
        user_email: The recipient's email address.
        username: The user's username.
    """
    try:
        resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [user_email],
            "subject": "Welcome to Alluring Lens Studios!",
            "html": f"<h1>Hello, {full_name}!</h1><p>Thank you for registering with Alluring Lens Studios.</p>"
        })
        print(f"Confirmation email sent to {user_email}.")
    except Exception as e:
        print(f"Failed to send email to {user_email}: {e}")