import { Link, LinkProps } from 'react-router-dom'

interface Props extends LinkProps {
  disabled?: boolean
}

export function ExtendedLink({ disabled, ...props }: Props) {
  if (disabled) {
    return (
      <button disabled className={`${props.className} pe-auto`}>
        {props.children}
      </button>
    )
  }
  return <Link {...props}>{props.children}</Link>
}
