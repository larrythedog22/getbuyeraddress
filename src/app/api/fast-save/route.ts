import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { contractAddress, page, transactions } = data;

        // Create data directory if it doesn't exist
        const dirPath = path.join(process.cwd(), 'data', contractAddress);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Save transactions directly
        const filename = path.join(dirPath, `raw_transactions_page_${page}.json`);
        fs.writeFileSync(filename, JSON.stringify(transactions));

        return NextResponse.json({ 
            success: true,
            message: `Saved ${transactions.length} transactions to page ${page}`
        });
    } catch (error) {
        console.error('Error saving data:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Failed to save data' 
        }, { 
            status: 500 
        });
    }
}
