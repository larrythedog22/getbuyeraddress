# Ethereum Buyer Address Tracker

A powerful tool developed by the LarryTalbot.xyz team for systematically extracting and analyzing unique buyer addresses from Ethereum contract transactions. This tool specializes in scanning the Base network for contract interactions, with a focus on buy transactions.

## 🌟 Features

- **Smart Contract Analysis**: Efficiently scans specific contract addresses for buy transactions
- **Intelligent Pagination**: Uses block-based pagination to ensure complete data collection
- **Rate Limiting**: Built-in smart rate limiting to handle API restrictions
- **Progress Tracking**: Saves progress and supports resume functionality
- **Duplicate Prevention**: Ensures each buyer address is counted only once
- **Base Network Support**: Specifically designed for Base network contract analysis

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A BaseScan API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/getethdata.git
cd getethdata
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your BaseScan API key:
```env
NEXT_PUBLIC_BASESCAN_API_KEY=your_api_key_here
```

### Running the Application

1. Start the development server:
```bash
npm run dev
# or
yarn dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

3. Enter the contract address you want to analyze and click "Start Scanning"

## 💡 Usage

1. **Enter Contract Address**: Input the Base network contract address you want to analyze
2. **Start Scanning**: Click the button to begin scanning for buyer addresses
3. **Monitor Progress**: Watch real-time progress as addresses are collected
4. **View Results**: Access the collected addresses in the `data/{contract_address}/unique_buyers.json` file

## 🔧 Technical Details

- **Network**: Base (Ethereum L2)
- **Transaction Filter**: Targets buy function (MethodID: 0x7deb6025)
- **Batch Size**: Processes 1000 transactions per API call
- **Progress Tracking**: Uses block numbers for precise pagination
- **Data Storage**: Local JSON file storage with automatic backup

## 📝 API Rate Limits

- BaseScan API has daily request limits
- Built-in rate limiting helps manage API usage
- Progress is automatically saved to resume later if limits are reached

## 🛠 Advanced Features

- **Resume Capability**: Can resume from last processed block
- **Duplicate Prevention**: Maintains a unique set of addresses
- **Error Handling**: Robust error handling with automatic retries
- **Progress Persistence**: Saves progress after each successful batch

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- [LarryTalbot.xyz](https://larrytalbot.xyz)
- [Base Network](https://base.org)
- [BaseScan API Documentation](https://basescan.org/apis)

## ⚠️ Disclaimer

This tool is provided as-is. Please ensure you comply with all relevant terms of service and API usage limits when using this tool.

---
Developed with ❤️ by the LarryTalbot.xyz team
