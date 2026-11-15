export default function Loading() {
  return (
    <main aria-busy="true" className="grid min-h-screen content-center gap-8 px-5 py-24 md:px-10">
      <div className="mx-auto w-full max-w-7xl">
        <p className="section-eyebrow"><span /> MAGIC / FIRST THREAD</p>
        <p className="mt-4 font-d text-6xl font-black">Preparing the collection.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="card aspect-[4/5] animate-pulse border-bone/10 bg-bone/5" />
          ))}
        </div>
        <p role="status" className="sr-only">Loading the collection</p>
      </div>
    </main>
  );
}
