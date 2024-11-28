import { NextResponse } from 'next/server';

async function fetchTransactionPage(contractAddress: string, page: number) {
  const baseUrl = 'https://basescan.org';
  const url = `${baseUrl}/txs?a=${contractAddress}&p=${page}`;

  console.log('Fetching URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Add more detailed logging
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response size:', html.length);
    console.log('Response preview:', html.slice(0, 500));
    
    // Check if we got a valid response
    if (html.includes('Access to this page has been denied')) {
      throw new Error('Access denied by BaseScan');
    }

    if (!html.includes('table') || !html.includes('tbody')) {
      console.log('Full HTML for debugging:', html);
      throw new Error('Invalid response format - no transaction table found');
    }

    return html;
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contractAddress = searchParams.get('address');
    const page = parseInt(searchParams.get('page') || '1');

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 });
    }

    const html = await fetchTransactionPage(contractAddress, page);

    // Check if we got a valid response
    if (!html || html.length < 100) {
      return NextResponse.json({ error: 'Invalid response from BaseScan' }, { status: 500 });
    }

    return NextResponse.json({ html, page });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transaction data' },
      { status: 500 }
    );
  }
}
