import { google } from 'googleapis';
import { Readable } from 'stream';

// Enforce configuration variables validation
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No media payload detected.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!privateKey || !clientEmail || !folderId) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString('base64');
      const mime = file.type || 'image/jpeg';
      const dataUrl = `data:${mime};base64,${base64}`;
      return new Response(
        JSON.stringify({
          success: true,
          url: dataUrl,
          filename: file.name,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize OAuth JWT client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: SCOPES,
    });
    const drive = google.drive({ version: 'v3', auth });

    // Convert File ArrayBuffer into a node readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Stream write request directly to Google Drive folder target
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    return new Response(
      JSON.stringify({
        success: true,
        fileId: driveResponse.data.id,
        url: driveResponse.data.webViewLink,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Drive Cloud Upload Interrupted:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Transmission failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
