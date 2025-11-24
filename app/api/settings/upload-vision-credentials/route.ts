import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!file.name.endsWith('.json')) {
            return NextResponse.json({ error: 'File must be a JSON file' }, { status: 400 });
        }

        // Create credentials directory if it doesn't exist
        const credentialsDir = path.join(process.cwd(), 'credentials');
        if (!existsSync(credentialsDir)) {
            await mkdir(credentialsDir, { recursive: true });
        }

        // Save file
        const fileName = 'google-vision-credentials.json';
        const filePath = path.join(credentialsDir, fileName);
        
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate JSON
        try {
            const jsonContent = JSON.parse(buffer.toString());
            
            // Basic validation for Google Cloud credentials
            if (!jsonContent.type || !jsonContent.project_id || !jsonContent.private_key) {
                return NextResponse.json(
                    { error: 'Invalid Google Cloud credentials JSON format' },
                    { status: 400 }
                );
            }
        } catch (parseError) {
            return NextResponse.json(
                { error: 'Invalid JSON file' },
                { status: 400 }
            );
        }

        await writeFile(filePath, buffer);

        // Return relative path instead of absolute path
        const relativePath = path.join('credentials', fileName);

        return NextResponse.json({
            success: true,
            path: relativePath, // Use relative path
            message: 'Credentials uploaded successfully'
        });

    } catch (error) {
        console.error('Error uploading credentials:', error);
        return NextResponse.json(
            { error: 'Failed to upload credentials' },
            { status: 500 }
        );
    }
}
