import yaml from 'js-yaml';

export interface OptionsData {
  ':ignore_for'?: string[];
  ':todo'?: string[];
  ':warning_todo'?: string[];
  ':precision'?: number;
}

// A key for an option type represented by an array of supported implementations
export type OptionKey = ':ignore_for' | ':todo' | ':warning_todo';

/**
 * Represents the possible options of a sass-spec test case.
 */
export default class SpecOptions {
  private data: OptionsData;
  constructor(data: OptionsData) {
    this.data = data;
  }

  /** Return whether this options file is empty and has no effect on test semantics. */
  get isEmpty(): boolean {
    return Object.entries(this.data).every(([key, value]) =>
      key === ':precision' ? value === 10 : value.length === 0
    );
  }

  /** Create SpecOptions from yaml contents (as a string) */
  static fromYaml(content: string): SpecOptions {
    // TODO validate
    return new SpecOptions((yaml.load(content) ?? {}) as OptionsData);
  }

  /** Create new SpecOptions by merging this with other options */
  merge(other: SpecOptions): SpecOptions {
    // return the result of these options merged with other options
    const mergeOption = (option: OptionKey) => {
      return [...(this.data[option] ?? []), ...(other.data[option] ?? [])];
    };
    return new SpecOptions({
      ':ignore_for': mergeOption(':ignore_for'),
      ':todo': mergeOption(':todo'),
      ':warning_todo': mergeOption(':warning_todo'),
      ':precision': other.data[':precision'] ?? this.data[':precision'],
    });
  }

  /** Get the run mode of the given implementation */
  getMode(impl: string): 'todo' | 'ignore' | undefined {
    if (this.hasForImpl(impl, ':ignore_for')) {
      return 'ignore';
    }
    if (this.hasForImpl(impl, ':todo')) {
      return 'todo';
    }
    return undefined;
  }

  /** Return whether this options object is :warning_todo for the given implementation */
  isWarningTodo(impl: string): boolean {
    return this.hasForImpl(impl, ':warning_todo');
  }

  /** Return whether this options object has the given `option` for `impl`. */
  hasForImpl(impl: string, option: OptionKey): boolean {
    return !!this.data[option]?.some(item => item.includes(impl));
  }

  /** Get the precision for this options object */
  precision(): number {
    return this.data[':precision'] ?? 10;
  }

  /** Return these options modified to add the given impl to the given option key */
  addImpl(impl: string, optKey: OptionKey): SpecOptions {
    const newOption = [...(this.data[optKey] ?? []), impl];
    return new SpecOptions({...this.data, [optKey]: newOption});
  }

  /** Return these options modified to remove the given impl from the given option key */
  removeImpl(impl: string, optKey: OptionKey): SpecOptions {
    const oldOption = this.data[optKey];
    if (!oldOption) return this;

    const index = oldOption.findIndex(item => item.includes(impl));
    if (index === -1) return this;

    if (oldOption.length === 1) {
      const newOptions = {...this.data};
      delete newOptions[optKey];
      return new SpecOptions(newOptions);
    }

    return new SpecOptions({
      ...this.data,
      [optKey]: [
        ...oldOption.slice(0, index),
        ...oldOption.slice(index + 1, oldOption.length),
      ],
    });
  }

  /** Convert this options object to a Yaml string */
  toYaml(): string {
    return yaml.dump(this.data).replace(/'(:[^']+)':/g, '$1:');
  }
}
