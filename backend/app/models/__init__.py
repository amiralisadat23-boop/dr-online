from app.models.user import User
from app.models.medical import PatientProfile, Vital
from app.models.link import UserPatientLink

try:
    from app.models.medication import Medication
except ImportError:
    pass

try:
    from app.models.note import MedicalNote
except ImportError:
    pass

try:
    from app.models.chat import ChatMessage
except ImportError:
    pass

from app.models.otp import OTPCode

from app.models.pending_registration import PendingRegistration
