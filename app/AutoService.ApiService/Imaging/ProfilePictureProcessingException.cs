namespace AutoService.ApiService.Imaging;

/**
 * Signals that an uploaded profile picture was rejected during decoding or resizing.
 *
 * The message is caller-facing: endpoints surface it as a 422 validation problem, so it
 * must never carry internal paths, identifiers, or decoder diagnostics.
 */
public sealed class ProfilePictureProcessingException(string message) : Exception(message);
