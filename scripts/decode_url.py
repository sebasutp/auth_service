from urllib.parse import urlparse, parse_qs

print("Hello")

def decode_http_parameters(url):
    """
    Decodes HTTP parameters from a given URL.

    Args:
        url (str): The URL containing HTTP parameters.

    Returns:
        dict: A dictionary containing the decoded parameters, or None if no parameters are found.
    """
    try:
        parsed_url = urlparse(url)
        query_string = parsed_url.query
        if query_string:
            params = parse_qs(query_string)
            # parse_qs returns lists for each value, so convert to single values if possible
            decoded_params = {}
            for key, values in params.items():
                if len(values) == 1:
                    decoded_params[key] = values[0]
                else:
                  decoded_params[key] = values
            return decoded_params
        else:
            return None  # No query parameters found
    except Exception as e:
        print(f"Error decoding URL: {e}")
        return None

# Example usage
url1 = "https://www.example.com/search?q=python&page=2"
url2 = "https://www.example.com/profile?user=john.doe&interests=coding&interests=reading"
url3 = "http://localhost:8000/api/v1/auth/google/callback?state=%257B%2527ru%2527%253A%2520%2527http%253A%2F%2Flocalhost%253A5173%2F%2527%257D&code=4%2F0AQSTgQECumgvBxvMvhSs64FIpVJiYt3o0xM8I60mYDZXGUEWVX0O2nIqkiIHHf5WGzV6ow&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=consent"
url4 = "not a valid URL"

decoded_params1 = decode_http_parameters(url1)
decoded_params2 = decode_http_parameters(url2)
decoded_params3 = decode_http_parameters(url3)
decoded_params4 = decode_http_parameters(url4)

print(f"Decoded parameters for '{url1}':\n {decoded_params1}")
print(f"\n\nDecoded parameters for '{url2}':\n {decoded_params2}")
print(f"\n\nDecoded parameters for '{url3}':\n {decoded_params3}")
print(f"\n\nDecoded parameters for '{url4}': {decoded_params4}")