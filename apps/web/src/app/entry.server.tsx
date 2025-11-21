import type { EntryContext } from '@react-router/node';
import { renderToString } from 'react-dom/server';
import { ServerRouter } from 'react-router';

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
) {
  const html = renderToString(<ServerRouter context={entryContext} />);
  
  responseHeaders.set('Content-Type', 'text/html');
  
  return new Response('<!DOCTYPE html>' + html, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}

