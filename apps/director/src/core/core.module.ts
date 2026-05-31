import { Module, OnModuleInit } from "@nestjs/common";
import { CoreRegistryService } from "./core-registry.service";
import { NodeMetadataProvider } from "./node-metadata-provider";
import { CoreConfig } from "@openvideo/core";

@Module({
  imports: [],
  providers: [CoreRegistryService, NodeMetadataProvider],
  exports: [CoreRegistryService],
})
export class CoreModule implements OnModuleInit {
  constructor(private nodeMetadataProvider: NodeMetadataProvider) {}

  onModuleInit() {
    CoreConfig.setMetadataProvider(this.nodeMetadataProvider);
  }
}
