# Ramadan Prayer Times - Bongao, Tawi-Tawi

A Next.js application that displays prayer times and Ramadan calendar for Bongao, Tawi-Tawi, Philippines. The application uses the Aladhan API to fetch accurate prayer times based on the geographical coordinates of Bongao.

## Features

- Display daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Real-time countdown to the next prayer
- Ramadan calendar with prayer times for the entire month
- Support for multiple years (2025-2029)
- Responsive design for mobile and desktop

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd puasa-website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- date-fns for date manipulation
- Axios for API requests

## API Integration

The application uses the Aladhan API for prayer times calculations. The API is called with the following parameters:

- Latitude: 5.0295 (Bongao)
- Longitude: 119.7738 (Bongao)
- Method: 4 (Umm Al-Qura University, Makkah)
- School: 1 (Shafi, standard for Philippines)

## Building for Production

To create a production build:

```bash
npm run build
```

Then start the production server:

```bash
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
