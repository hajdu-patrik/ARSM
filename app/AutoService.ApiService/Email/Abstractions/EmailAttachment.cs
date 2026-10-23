namespace AutoService.ApiService.Email;

/** File attached to an e-mail; a non-null ContentId marks an inline (CID) attachment. */
public sealed record EmailAttachment(string FileName, byte[] Content, string ContentType, string? ContentId);
