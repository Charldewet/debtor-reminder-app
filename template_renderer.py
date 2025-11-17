"""
Template Rendering Utility

Simple template rendering for email and SMS messages.
Supports {variable} placeholders with safe fallback.
"""

import re
from typing import Dict, Any


def render_template_string(template: str, **kwargs: Any) -> str:
    """
    Render a template string by replacing {variable} placeholders.
    
    Args:
        template: Template string with {variable} placeholders
        **kwargs: Variables to substitute
        
    Returns:
        Rendered string with variables replaced
        
    Example:
        >>> render_template_string("Hi {name}, your balance is {amount}", name="John", amount="100")
        'Hi John, your balance is 100'
    """
    if not template:
        return ""
    
    try:
        # Use Python's built-in string formatting
        return template.format(**kwargs)
    except KeyError as e:
        # If variable not found, leave placeholder as-is
        # This allows partial templates
        missing_var = e.args[0]
        return template.replace(f"{{{missing_var}}}", f"{{{missing_var}}}")
    except Exception:
        # Fallback: use regex replacement for safety
        def replace_var(match):
            var_name = match.group(1)
            return str(kwargs.get(var_name, match.group(0)))
        
        return re.sub(r'\{(\w+)\}', replace_var, template)


def render_email_template(subject_template: str, body_template: str, **kwargs: Any) -> Dict[str, str]:
    """
    Render both email subject and body templates.
    
    Args:
        subject_template: Email subject template
        body_template: Email body template (HTML)
        **kwargs: Variables to substitute
        
    Returns:
        Dictionary with 'subject' and 'body' keys
    """
    return {
        'subject': render_template_string(subject_template, **kwargs),
        'body': render_template_string(body_template, **kwargs)
    }


def validate_template(template: str, required_vars: list = None) -> tuple[bool, list]:
    """
    Validate that template contains required variables.
    
    Args:
        template: Template string to validate
        required_vars: List of required variable names (without braces)
        
    Returns:
        Tuple of (is_valid, missing_vars)
    """
    if not required_vars:
        return True, []
    
    if not template:
        return False, required_vars
    
    missing = []
    for var in required_vars:
        if f"{{{var}}}" not in template:
            missing.append(var)
    
    return len(missing) == 0, missing


def sanitize_html(html_content: str) -> str:
    """
    Basic HTML sanitization to prevent XSS attacks.
    In production, use a proper HTML sanitizer like bleach.
    
    Args:
        html_content: HTML content to sanitize
        
    Returns:
        Sanitized HTML content
    """
    # Remove script tags
    html_content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.IGNORECASE | re.DOTALL)
    
    # Remove javascript: protocols
    html_content = re.sub(r'javascript:', '', html_content, flags=re.IGNORECASE)
    
    # Remove on* event handlers
    html_content = re.sub(r'\s*on\w+\s*=\s*["\'][^"\']*["\']', '', html_content, flags=re.IGNORECASE)
    
    return html_content


def truncate_sms(message: str, max_length: int = 160) -> str:
    """
    Truncate SMS message to maximum length.
    
    Args:
        message: SMS message
        max_length: Maximum length (default 160)
        
    Returns:
        Truncated message
    """
    if len(message) <= max_length:
        return message
    
    return message[:max_length - 3] + "..."


# Example usage
if __name__ == "__main__":
    # Test template rendering
    template = "Hi {name}, your account {acc_no} has balance R{amount}"
    result = render_template_string(
        template,
        name="John Doe",
        acc_no="123456",
        amount="1,234.56"
    )
    print(result)  # Hi John Doe, your account 123456 has balance R1,234.56
    
    # Test validation
    is_valid, missing = validate_template(template, ['name', 'acc_no', 'amount'])
    print(f"Valid: {is_valid}, Missing: {missing}")

