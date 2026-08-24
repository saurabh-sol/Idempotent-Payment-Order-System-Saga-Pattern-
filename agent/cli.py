"""
CLI interface for the shopping agent.

Usage:
    python -m agent.cli [--provider anthropic|openai]
"""
import asyncio
import argparse
import os
import sys

from agent.agent import ShoppingAgent


def print_banner():
    print("\n" + "=" * 50)
    print("  Shopping Agent CLI")
    print("  Idempotent Payment System Demo")
    print("=" * 50)
    print("\nCommands:")
    print("  Type your message to chat with the agent")
    print("  /reset - Reset conversation")
    print("  /quit  - Exit")
    print("\n" + "-" * 50 + "\n")


async def main():
    parser = argparse.ArgumentParser(description="Shopping Agent CLI")
    parser.add_argument(
        "--provider",
        choices=["anthropic", "openai"],
        default="anthropic",
        help="LLM provider to use",
    )
    args = parser.parse_args()
    
    api_key = os.getenv("ANTHROPIC_API_KEY") if args.provider == "anthropic" else os.getenv("OPENAI_API_KEY")
    if not api_key:
        print(f"Error: {'ANTHROPIC_API_KEY' if args.provider == 'anthropic' else 'OPENAI_API_KEY'} not set")
        print("Please set the environment variable and try again.")
        sys.exit(1)
    
    agent = ShoppingAgent(provider=args.provider)
    print_banner()
    print(f"Using {args.provider.upper()} as the LLM provider.\n")
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() == "/quit":
                print("\nGoodbye!")
                break
            
            if user_input.lower() == "/reset":
                agent.reset()
                print("\nConversation reset.\n")
                continue
            
            print("\nAgent: ", end="", flush=True)
            response = await agent.chat(user_input)
            print(response)
            print()
            
        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}\n")


if __name__ == "__main__":
    asyncio.run(main())
