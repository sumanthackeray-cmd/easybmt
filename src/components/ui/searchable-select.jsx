import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer"

export function SearchableSelect({ 
  options = [], 
  value, 
  onValueChange, 
  placeholder = "Select option...", 
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  portaled = true
}) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  const [typedBuffer, setTypedBuffer] = React.useState("")
  const [isHovered, setIsHovered] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const bufferTimeoutRef = React.useRef(null)

  // Standard Indian State abbreviations mapping to expanded terms
  const STATE_ABBREVIATIONS = React.useMemo(() => ({
    "jk": "Jammu", "hp": "Himachal", "pb": "Punjab", "ch": "Chandigarh", "uk": "Uttarakhand",
    "ua": "Uttarakhand", "hr": "Haryana", "dl": "Delhi", "rj": "Rajasthan", "up": "Uttar",
    "br": "Bihar", "sk": "Sikkim", "ar": "Arunachal", "nl": "Nagaland", "mn": "Manipur",
    "mz": "Mizoram", "tr": "Tripura", "ml": "Meghalaya", "as": "Assam", "wb": "West Bengal",
    "jh": "Jharkhand", "od": "Odisha", "or": "Odisha", "cg": "Chhattisgarh", "mp": "Madhya",
    "gj": "Gujarat", "mh": "Maharashtra", "ap": "Andhra", "ka": "Karnataka", "ga": "Goa",
    "kl": "Kerala", "tn": "Tamil", "tg": "Telangana", "ts": "Telangana"
  }), []);

  // Options should be an array of { label: string, value: string }
  // If array of strings is passed, map it internally
  const formattedOptions = React.useMemo(() => {
    if (!options || !Array.isArray(options)) return [];
    if (options.length > 0 && typeof options[0] === 'string') {
      return options.map(opt => ({ label: opt, value: opt }));
    }
    return options;
  }, [options]);

  const selectedOption = formattedOptions.find((opt) => String(opt.value) === String(value));

  // Keyboard navigation / selection by typing when hovered or focused
  React.useEffect(() => {
    if (!isHovered && !isFocused) return;

    const handleKeyDown = (e) => {
      // Guard: do not hijack keyboard if user is typing in an active text input or textarea
      if (
        document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' || 
         document.activeElement.isContentEditable) &&
         document.activeElement.role !== 'combobox'
      ) {
        return;
      }

      // Capture single alphanumeric characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        
        setTypedBuffer(prev => {
          const newBuffer = (prev + e.key).toLowerCase();
          
          if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
          
          bufferTimeoutRef.current = setTimeout(() => {
            setTypedBuffer("");
          }, 1200);

          let expandedQuery = newBuffer;
          if (newBuffer.length === 2 && STATE_ABBREVIATIONS[newBuffer]) {
            expandedQuery = STATE_ABBREVIATIONS[newBuffer].toLowerCase();
          }

          const match = formattedOptions.find(opt => {
            const labelStr = String(opt.label).toLowerCase();
            const valueStr = String(opt.value).toLowerCase();
            
            return labelStr.startsWith(newBuffer) || 
                   valueStr.startsWith(newBuffer) ||
                   labelStr.includes(expandedQuery) || 
                   valueStr.includes(expandedQuery);
          });

          if (match) {
            onValueChange(match.value);
          }

          return newBuffer;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (bufferTimeoutRef.current) clearTimeout(bufferTimeoutRef.current);
    };
  }, [isHovered, isFocused, formattedOptions, onValueChange, STATE_ABBREVIATIONS]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setTypedBuffer("");
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setTypedBuffer("");
            }}
            className={cn(
              "w-full justify-between font-normal text-slate-900 dark:text-slate-100 transition-all duration-150", 
              typedBuffer && "ring-2 ring-amber-400 border-amber-400 bg-amber-400/5",
              className
            )}
          >
            {typedBuffer ? (
              <span className="font-extrabold text-amber-500 animate-pulse">Typing: "{typedBuffer.toUpperCase()}"</span>
            ) : selectedOption ? (
              selectedOption.label
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="p-0 max-h-[85vh] bg-card text-slate-900 dark:text-slate-100 border-border">
          <div className="p-4 text-center font-bold text-sm tracking-wide text-slate-500 dark:text-slate-400 border-b border-border/40 pb-3">
            {placeholder}
          </div>
          <Command className="pb-6">
            <CommandInput placeholder={searchPlaceholder} className="border-none focus:ring-0 text-slate-900 dark:text-slate-100" />
            <CommandList className="max-h-[50vh] overflow-y-auto mt-2">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {formattedOptions.map((opt) => (
                  <CommandItem
                    key={String(opt.value)}
                    value={opt.label}
                    onSelect={() => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    onPointerDown={(e) => {
                      onValueChange(opt.value);
                      setOpen(false);
                    }}
                    className="py-3 px-4 text-sm flex items-center hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        String(value) === String(opt.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setTypedBuffer("");
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTypedBuffer("");
          }}
          className={cn(
            "w-full justify-between font-normal text-slate-900 dark:text-slate-100 transition-all duration-150", 
            typedBuffer && "ring-2 ring-amber-400 border-amber-400 bg-amber-400/5",
            className
          )}
        >
          {typedBuffer ? (
            <span className="font-extrabold text-amber-500 animate-pulse">Typing: "{typedBuffer.toUpperCase()}"</span>
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        side="bottom"
        avoidCollisions={true}
        portaled={portaled}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {formattedOptions.map((opt) => (
                <CommandItem
                  key={String(opt.value)}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  onPointerDown={(e) => {
                    // Bypass cmdk internal event swallowing in Dialogs
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  onClick={(e) => {
                    // Standard click fallback
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(opt.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
