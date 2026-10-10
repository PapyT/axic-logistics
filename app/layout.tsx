import type { Metadata } from 'next';
import './globals.css';
import './theme.css';
export const metadata:Metadata={title:'AXIC Logistics | Logistics, connected.',description:'Move with certainty. Explore an interactive freight quote, connected shipment tracking and a logistics operations workspace.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
