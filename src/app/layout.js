import "./globals.css";

export const metadata = {
  title: "LoanVision – Excel Data Visualiser",
  description: "Upload loan register Excel files, visualise data as charts, and auto-detect quality issues including duplicates and format errors.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
