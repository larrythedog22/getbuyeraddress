import { ethers } from 'ethers';

interface Transaction {
    from: string;
    input: string;
    blockNumber: string;
}

interface ApiResponse {
    status: string;
    message: string;
    result: Transaction[];
}

interface SavedProgress {
    totalBuyers: number;
    addresses: string[];
    lastProcessedPage?: number;
    lastProcessedBlock?: number;
}

// Static delay times to prevent escalation
const DELAYS = {
    BETWEEN_CALLS: 300,     // Increased base delay between calls
    MIN_RATE_LIMIT_WAIT: 6000,  // Minimum wait time when rate limited
    MAX_RATE_LIMIT_WAIT: 15000, // Maximum wait time when rate limited
    BETWEEN_BATCHES: 2000   // Increased delay between batches
};

class RateLimiter {
    private lastCallTime = 0;
    private consecutiveErrors = 0;
    private baseWaitTime = DELAYS.MIN_RATE_LIMIT_WAIT;

    async waitIfNeeded() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCallTime;
        
        const waitTime = Math.max(
            DELAYS.BETWEEN_CALLS,
            this.consecutiveErrors > 0 ? DELAYS.BETWEEN_CALLS * 2 : DELAYS.BETWEEN_CALLS
        );
        
        if (timeSinceLastCall < waitTime) {
            await new Promise(resolve => setTimeout(resolve, waitTime - timeSinceLastCall));
        }
        
        this.lastCallTime = Date.now();
    }

    recordError() {
        this.consecutiveErrors++;
        // Exponential backoff for rate limit wait time
        this.baseWaitTime = Math.min(
            this.baseWaitTime * 1.5,
            DELAYS.MAX_RATE_LIMIT_WAIT
        );
    }

    recordSuccess() {
        this.consecutiveErrors = 0;
        this.baseWaitTime = DELAYS.MIN_RATE_LIMIT_WAIT;
    }

    getWaitTime() {
        return this.baseWaitTime;
    }
}

const rateLimiter = new RateLimiter();

async function fetchTransactionsFromApi(contractAddress: string, page: number, startBlock: number = 0): Promise<{ addresses: string[], lastBlock: number }> {
    const apiKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY;
    if (!apiKey) {
        throw new Error('BaseScan API key not found. Please add NEXT_PUBLIC_BASESCAN_API_KEY to your .env.local file');
    }

    // Use consistent offset and track progress by block number
    const offset = 1000;

    const params = new URLSearchParams({
        module: 'account',
        action: 'txlist',
        address: contractAddress,
        startblock: startBlock.toString(),
        endblock: '999999999',
        page: '1',  // Always use page 1 since we're using block numbers for pagination
        offset: offset.toString(),
        sort: 'asc',
        apikey: apiKey
    });

    console.log(`Fetching transactions from block ${startBlock} (page ${page})...`);
    
    try {
        const response = await fetch(`https://api.basescan.org/api?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        
        if (data.status === '0') {
            if (data.message.includes('No transactions found')) {
                return { addresses: [], lastBlock: 0 };
            }
            if (data.message.includes('Max rate limit reached') || data.message.includes('daily limit')) {
                throw new Error('DAILY_LIMIT_REACHED');
            }
            if (data.message === 'NOTOK' || data.message.includes('rate limit')) {
                throw new Error('API limit hit');
            }
            throw new Error(`API Error: ${data.message}`);
        }

        // Get the last block number from this batch
        let lastBlockNumber = 0;
        if (data.result.length > 0) {
            lastBlockNumber = parseInt(data.result[data.result.length - 1].blockNumber);
        }
        
        // Filter for buy function calls and extract unique buyer addresses
        const buyerAddresses = data.result
            .filter(tx => tx.input.startsWith('0x7deb6025'))
            .map(tx => tx.from.toLowerCase());

        console.log(`Page ${page}: Found ${data.result.length} total transactions, ${buyerAddresses.length} buy transactions (Blocks ${startBlock} - ${lastBlockNumber})`);
        
        return {
            addresses: buyerAddresses,
            lastBlock: lastBlockNumber
        };
    } catch (error) {
        console.error(`✗ Error on page ${page}:`, error);
        throw error;
    }
}

async function fetchWithRetry(contractAddress: string, page: number, startBlock: number = 0, retries = 3): Promise<{ addresses: string[], lastBlock: number }> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await rateLimiter.waitIfNeeded();
            const result = await fetchTransactionsFromApi(contractAddress, page, startBlock);
            rateLimiter.recordSuccess();
            return result;
        } catch (error) {
            rateLimiter.recordError();
            if (error instanceof Error && error.message.includes('API limit hit')) {
                const waitTime = rateLimiter.getWaitTime();
                console.log(`Rate limited on attempt ${attempt + 1}, waiting ${waitTime}ms...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
    console.log(`All ${retries} attempts failed for page ${page}`);
    return { addresses: [], lastBlock: 0 };
}

async function loadSavedProgress(contractAddress: string): Promise<SavedProgress | null> {
    try {
        const response = await fetch(`/data/${contractAddress}/unique_buyers.json`);
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.log('No previous progress found');
        return null;
    }
}

async function saveAddresses(contractAddress: string, addresses: string[], lastProcessedPage?: number, lastProcessedBlock?: number): Promise<void> {
    try {
        const response = await fetch('/api/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename: `data/${contractAddress}/unique_buyers.json`,
                content: JSON.stringify({ 
                    totalBuyers: addresses.length,
                    addresses: addresses,
                    lastProcessedPage,
                    lastProcessedBlock
                }, null, 2)
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to save addresses: ${response.statusText}`);
        }

        console.log(`✓ Saved ${addresses.length} unique buyer addresses${lastProcessedPage ? ` (up to page ${lastProcessedPage})` : ''}${lastProcessedBlock ? ` (up to block ${lastProcessedBlock})` : ''}`);
    } catch (error) {
        console.error('Failed to save addresses:', error);
        throw error;
    }
}

export async function getAllBuyerAddresses(contractAddress: string): Promise<{ buyerAddresses: string[], lastProcessedPage?: number, isComplete: boolean }> {
    // Load existing progress
    const savedProgress = await loadSavedProgress(contractAddress);
    const allAddresses = new Set<string>(savedProgress?.addresses || []);
    let currentPage = (savedProgress?.lastProcessedPage || 0) + 1;
    let currentBlock = savedProgress?.lastProcessedBlock || 0;
    const batchSize = 2;
    let isComplete = false;
    
    console.log(savedProgress ? 
        `Resuming from page ${currentPage} (block ${currentBlock}) with ${allAddresses.size} existing addresses` :
        'Starting new scan from block 0');
    
    try {
        while (true) {
            const pages = Array.from({ length: batchSize }, (_, i) => currentPage + i);
            console.log(`\nProcessing pages ${pages[0]} to ${pages[pages.length - 1]}...`);
            
            let hasMoreData = false;
            let batchSuccess = true;
            let lastSuccessfulPage = currentPage - 1;
            let newAddressesInBatch = 0;
            
            for (const page of pages) {
                try {
                    const result = await fetchWithRetry(contractAddress, page, currentBlock);
                    if (result.addresses.length > 0) {
                        hasMoreData = true;
                        const sizeBefore = allAddresses.size;
                        result.addresses.forEach(addr => allAddresses.add(addr));
                        const newAddresses = allAddresses.size - sizeBefore;
                        newAddressesInBatch += newAddresses;
                        console.log(`Page ${page}: Added ${newAddresses} new unique addresses`);
                        currentBlock = result.lastBlock + 1;
                    } else {
                        hasMoreData = false;
                        break;
                    }
                    lastSuccessfulPage = page;
                } catch (error) {
                    if (error instanceof Error) {
                        if (error.message === 'DAILY_LIMIT_REACHED') {
                            console.log('\n⚠️ Daily API limit reached. Saving current progress...');
                            if (newAddressesInBatch > 0) {
                                console.log(`Found ${newAddressesInBatch} new addresses in this batch before limit`);
                                await saveAddresses(contractAddress, Array.from(allAddresses), lastSuccessfulPage, currentBlock);
                            }
                            return {
                                buyerAddresses: Array.from(allAddresses),
                                lastProcessedPage: lastSuccessfulPage,
                                isComplete: false
                            };
                        }
                    }
                    console.error(`Failed to process page ${page}:`, error);
                    batchSuccess = false;
                    break;
                }
            }
            
            // Save progress after each successful batch if we found new addresses
            if (batchSuccess && newAddressesInBatch > 0) {
                console.log(`Batch complete: Added ${newAddressesInBatch} new addresses (Total: ${allAddresses.size})`);
                await saveAddresses(contractAddress, Array.from(allAddresses), lastSuccessfulPage, currentBlock);
            }
            
            if (!hasMoreData) {
                console.log('\nNo more transactions found. Collection complete.');
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, DELAYS.BETWEEN_BATCHES));
            currentPage += batchSize;
        }
    } catch (error) {
        console.error('Error during collection:', error);
        if (error instanceof Error && error.message.includes('No transactions found')) {
            return { buyerAddresses: [], isComplete: true };
        }
        throw error;
    }
    
    const finalAddresses = Array.from(allAddresses);
    console.log(`Collection complete! Found ${finalAddresses.length} unique buyers`);
    await saveAddresses(contractAddress, finalAddresses, currentPage - 1, currentBlock);
    return { 
        buyerAddresses: finalAddresses,
        isComplete: true
    };
}
