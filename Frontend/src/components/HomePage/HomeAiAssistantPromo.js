import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  SparklesIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'
import { ASSISTANT_PATH, assistantStartNewState } from '../ChatBot/assistantNavigation'
import Reveal from './Reveal'

const perks = [
  {
    icon: BoltIcon,
    title: 'One message, not ten tabs',
    text: 'Search, compare, and add to cart without leaving the chat.',
  },
  {
    icon: ShoppingBagIcon,
    title: 'No account to start',
    text: 'Browse and build your cart freely — sign in only when you are ready to pay.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Talk like a human',
    text: 'Type naturally — even in Telugu, Hindi, or Tamil using English letters.',
  },
]

const demoMessages = [
  {
    role: 'user',
    text: 'I need a cricket bat under ₹2,000, size 6',
  },
  {
    role: 'assistant',
    text: 'Found 3 bats that fit — SG, MRF, and SS. Want details or should I add one?',
  },
  {
    role: 'user',
    text: 'Add the MRF in size 6',
  },
  {
    role: 'assistant',
    text: 'Added to your cart ✓ Sign in when you are ready to pay.',
  },
]

const examplePrompts = [
  'Find a cricket ball',
  'What’s in my cart?',
  'Proceed to checkout',
]

export default function HomeAiAssistantPromo() {
  return (
    <section className="relative overflow-hidden border-b border-stone-200 bg-white py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-indigo-100/80 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-fuchsia-100/60 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-100">
              <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
              AI-native shopping
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Tired of endless scrolling?
            </h2>

            <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
              Skip the filter maze. Tell our AI what you want — it searches the catalog and updates
              your cart in one conversation. No sign-up required until checkout.
            </p>

            <ul className="mt-8 space-y-4">
              {perks.map((perk) => (
                <li key={perk.title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <perk.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{perk.title}</p>
                    <p className="mt-0.5 text-sm text-stone-600">{perk.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to={ASSISTANT_PATH}
                state={assistantStartNewState}
                className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl"
              >
                Try AI shopping
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <p className="text-xs text-stone-500">
                Or use the chat bubble on any page — account only needed at payment
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-xl shadow-stone-900/10 ring-1 ring-stone-900/5">
                <div className="flex items-center gap-2 border-b border-stone-200 bg-white px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">ShopAI Assistant</p>
                    <p className="text-xs text-emerald-600">Online · no login required</p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-5">
                  {demoMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'rounded-br-md bg-indigo-600 text-white'
                            : 'rounded-bl-md border border-stone-200 bg-white text-stone-700 shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-stone-200 bg-white px-4 py-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                    Try asking
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {prompt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-stone-500">
                Search → add to cart → sign in to pay. That is it.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
