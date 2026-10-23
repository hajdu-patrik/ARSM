namespace AutoService.ApiService.Email.Templates;

/** Body of one mail: HTML fragments must already be escaped; the text parts carry no markup. */
internal sealed record EmailLayoutContent(
    string Title,
    string HungarianHtml,
    string EnglishHtml,
    string HungarianText,
    string EnglishText,
    EmailFooter Footer);
