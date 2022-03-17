export interface MarkdownPreviewProps {
  content: string | undefined;
}


export function MarkdownPreview(props: MarkdownPreviewProps) {
  return <div dangerouslySetInnerHTML={ { __html: props.content || "" } }/>;
}
