import Container from '@/components/ui/Container'


export default function Footer() {
return (
<footer className="mt-10 border-t bg-brand-gray">
<Container className="py-8 text-sm text-zinc-700">
<div className="flex flex-col md:flex-row justify-between gap-4">
<p>© {new Date().getFullYear()} BRICOTITAN</p>
<div className="flex gap-6">
<a href="#" className="hover:underline">Privacidad</a>
<a href="#" className="hover:underline">Términos</a>
<a href="#" className="hover:underline">Contacto</a>
</div>
</div>
</Container>
</footer>
)
}