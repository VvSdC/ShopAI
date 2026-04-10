import { Link } from 'react-router-dom'
import HomeCategories from './HomeCategories'
import HomeProductTrending from './HomeProductTrending'

// offers removed: unused

const perks = [
  {
    name: 'Hassle-Free Returns',
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'/%3E%3C/svg%3E",
    description:
      'Our commitment to customer satisfaction includes a hassle-free return policy. If you receive damaged products, we offer free returns, ensuring your peace of mind and a seamless shopping experience.',
  },
  {
    name: 'Instant Dispatch',
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-2.25 0h-2.25m0 0V5.625c0-.621-.504-1.125-1.125-1.125H4.875c-.621 0-1.125.504-1.125 1.125v12.999m9 0H9.75m0 0h-2.25'/%3E%3C/svg%3E",
    description:
      'Experience lightning-fast delivery with our one-day delivery service! Shop now and enjoy the convenience of receiving your products within hours of checkout. Get ready to enjoy your purchases without the wait!',
  },
  {
    name: 'Yearlong Savings',
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z'/%3E%3C/svg%3E",
    description: `Discover endless savings with our exclusive code "ALLYEAR"! Unlock incredible deals at checkout and enjoy year-round discounts.  Grab the best offers today!`,
  },
  {
    name: 'Sustainable Impact',
    imageUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='1' stroke='%236366f1'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 0 1-1.161.886l-.143.048a1.107 1.107 0 0 0-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 0 1-1.652.928l-.679-.906a1.125 1.125 0 0 0-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 1 0-8.862 12.872M12.75 3.031a9 9 0 0 1 6.69 14.036m0 0-.177-.529A2.25 2.25 0 0 0 17.128 15H16.5l-.324-.324a1.453 1.453 0 0 0-2.328.377l-.036.073a1.586 1.586 0 0 1-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438c.08.474.49.821.97.821.846 0 1.598.542 1.865 1.345l.215.643m-6.218-8.677a1.125 1.125 0 0 1 .26-1.431l1.004-.827'/%3E%3C/svg%3E",
    description: `We are committed to preserve and restore the environment by pledging 1% of our sales. With every purchase, you contribute to our ongoing efforts in safeguarding our planet's precious ecosystems for future.`,
  },
]
export default function Example() {
  return (
    <div className="bg-white">
      <main>
        {/* Hero */}
        <div className="flex flex-col border-b border-gray-200 lg:border-0">
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute hidden h-full w-1/2 bg-gray-100 lg:block"
            />
            <div className="relative bg-gray-100 lg:bg-transparent">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:grid lg:grid-cols-2 lg:px-8">
                <div className="mx-auto max-w-2xl py-24 lg:max-w-none lg:py-64">
                  <div className="lg:pr-16">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl xl:text-6xl">
                      Assured Shopping
                      <p style={{ marginTop: '20px' }} className="text-4xl">
                        Buy with Confidence
                      </p>
                    </h1>
                    <p className="mt-4 text-xl text-gray-600">
                      New products are added every week. Check back often to see
                    </p>
                    <div className="mt-6">
                      <a
                        href="/products-filters"
                        className="inline-block rounded-md border border-transparent bg-indigo-600 py-3 px-8 font-medium text-white hover:bg-indigo-700"
                        style={{ background: '#CD1818', alignItems: 'center' }}
                      >
                        All products
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-35 w-full sm:h-50 lg:absolute lg:top-0 lg:right-0 lg:h-full lg:w-1/2">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
                alt=""
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          {/* Sale */}
          <section
            aria-labelledby="sale-heading"
            className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pt-32 text-center sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-2xl lg:max-w-none">
              <h2
                id="sale-heading"
                className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl"
                style={{
                  marginBottom: '40px',
                  fontFamily: 'courier',
                  fontSize: '55px',
                }}
              >
                Exclusive, Limited Stock: Act Now!
              </h2>
              <p
                className="mx-auto mt-4 max-w-xl text-xl text-gray-600"
                style={{ fontFamily: 'sans-serif' }}
              >
                Discover exclusive limited editions. Once they're gone, they're
                gone. Don't miss out on your must-have items.
              </p>
              <a
                href="#"
                className="mt-6 inline-block w-full rounded-md border border-transparent bg-gray-900 py-3 px-8 font-medium text-white hover:bg-gray-800 sm:w-auto"
                style={{ background: '#176B87', fontSize: '17px' }}
              >
                Get access to our one-time sale
              </a>
            </div>
          </section>
        </div>
      </main>
      <main>
        {/* Category section */}
        <section
          aria-labelledby="category-heading"
          className="pt-24 sm:pt-32 xl:mx-auto xl:max-w-7xl xl:px-8"
        >
          <div className="px-4 sm:flex sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-0">
            <h2
              id="category-heading"
              className="text-2xl font-bold tracking-tight text-gray-900"
              style={{
                fontFamily: 'cursive',
                fontSize: '30px',
                marginBottom: '30px',
              }}
            >
              Shop by Category
            </h2>
            <Link
              to="/all-categories"
              className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
              style={{ fontSize: '20px' }}
            >
              Browse all categories
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
          {/* home categories */}
          <HomeCategories />
        </section>
        {/* Home trending trending */}
        <HomeProductTrending />

        {/* info */}
        <section
          aria-labelledby="perks-heading"
          className="border-t border-gray-200 bg-gray-50"
        >
          <h2 id="perks-heading" className="sr-only">
            Our perks
          </h2>

          <div className="mx-auto max-w-7xl py-24 px-4 sm:px-6 sm:py-32 lg:px-8">
            <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-0">
              {perks.map((perk) => (
                <div
                  key={perk.name}
                  className="text-center md:flex md:items-start md:text-left lg:block lg:text-center"
                >
                  <div className="md:flex-shrink-0">
                    <div className="flow-root">
                      <img
                        className="-my-1 mx-auto h-36 w-auto"
                        src={perk.imageUrl}
                        alt=""
                      />
                    </div>
                  </div>
                  <div className="mt-6 md:mt-0 md:ml-4 lg:mt-6 lg:ml-0">
                    <h3
                      className="text-base font-medium text-gray-900"
                      style={{ fontSize: '20px' }}
                    >
                      {perk.name}
                    </h3>
                    <p className="mt-3 text-sm text-gray-500">
                      {perk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
