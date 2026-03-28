import Link from 'next/link';

export default function SideNav() {
    return (
        <div className="bg-black text-white flex flex-col"> 
            <Link href="/">HOME</Link>
            <Link href="/xhs">XHS</Link>
            <Link href="/rakuten">RAKUTEN</Link>
            <Link href="/scraper">SCRAPER</Link>
        </div>
    )
}