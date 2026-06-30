import { formatMessage } from '../chatFormatting'
import ProductListingCards from './ProductListingCards'
import ProductDetailCard from './ProductDetailCard'
import CartSummaryCard from './CartSummaryCard'
import AddressPickerCards from './AddressPickerCards'
import ChatQuickActions from './ChatQuickActions'

function renderBlock(block, { onQuickAction, disabled }) {
  if (!block?.type) return null

  switch (block.type) {
    case 'product_listing':
      return <ProductListingCards key="listing" products={block.products} />
    case 'product_detail':
      return <ProductDetailCard key="detail" product={block.product} />
    case 'cart_summary':
      return <CartSummaryCard key="cart" cart={block.cart} />
    case 'address_picker':
      return (
        <AddressPickerCards
          key="addresses"
          addresses={block.addresses}
          onSelect={onQuickAction}
          disabled={disabled}
        />
      )
    case 'quick_actions':
      return (
        <ChatQuickActions
          key="actions"
          actions={block.actions}
          quantityInput={block.quantityInput}
          onSelect={onQuickAction}
          disabled={disabled}
        />
      )
    default:
      return null
  }
}

export default function ChatMessageBody({
  content,
  blocks = [],
  onQuickAction,
  disabled = false,
}) {
  const hasBlocks = Array.isArray(blocks) && blocks.length > 0

  return (
    <div className="chat-message-body">
      {content ? <div className="chat-message-text">{formatMessage(content)}</div> : null}
      {hasBlocks ? (
        <div className="chat-message-blocks">
          {blocks.map((block, index) => (
            <div key={`${block.type}-${index}`}>
              {renderBlock(block, { onQuickAction, disabled })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
