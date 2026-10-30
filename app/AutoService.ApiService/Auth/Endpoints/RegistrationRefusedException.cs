namespace AutoService.ApiService.Auth.Endpoints;

/** A registration refusal that carries the validation error key and the plain client message. */
internal sealed class RegistrationRefusedException : Exception
{
    public RegistrationRefusedException(string key, string message)
        : base(message)
    {
        Key = key;
    }

    public string Key { get; }
}
