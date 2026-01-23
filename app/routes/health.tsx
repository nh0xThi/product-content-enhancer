// Health check endpoint for Render.io and other platforms
export async function loader() {
  return new Response("OK", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
