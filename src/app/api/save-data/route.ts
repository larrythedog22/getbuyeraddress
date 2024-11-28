import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { filename, content } = data;

        if (!filename || !content) {
            return NextResponse.json({ error: 'Missing filename or content' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), filename);
        const dirPath = path.dirname(filePath);
        
        await fs.mkdir(dirPath, { recursive: true });
        await fs.writeFile(filePath, content);
        
        return NextResponse.json({ 
            success: true,
            message: 'File saved successfully',
            filePath
        });
    } catch (error) {
        console.error('Error saving data:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to save data',
            details: error instanceof Error ? error.stack : undefined
        }, { 
            status: 500 
        });
    }
}
