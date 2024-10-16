import { Command } from '@heroku-cli/command';
export default class MembersSet extends Command {
    static topic: string;
    static description: string;
    static strict: boolean;
    static flags: {
        role: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces/parser").CustomOptions>;
        team: import("@oclif/core/lib/interfaces").OptionFlag<string, import("@oclif/core/lib/interfaces/parser").CustomOptions>;
    };
    run(): Promise<void>;
}