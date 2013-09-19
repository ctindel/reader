#Please avoid adding any imports
import imp
import os
import os.path
import pwd
import socket
from string import Template
import sys
import yaml
 
context = {}
context['user'] = pwd.getpwuid(os.getuid())[0]
context['hostname'] = socket.gethostname()
context['root'] = _root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
 
# All strings will become templates with context as the mapping
tag = u'tag:yaml.org,2002:str'
original_str_constructor = yaml.loader.Loader.yaml_constructors[tag]
def new_str_constructor(loader, node):
    new_object = Template(original_str_constructor(loader, node))
    return new_object.safe_substitute(context)
 
yaml.add_constructor(tag, new_str_constructor)
 
# we first add our top-level config file
configdict = yaml.load(file(os.path.join(_root, 'etc', 'config.yaml')))
 
# Add in provider definitions
configdict['providers'] = dict([(provider['name'], provider) for provider in yaml.load(open(os.path.join(context['root'], 'etc', 'providers.yaml')).read()) if provider['active']])
 
configdict['provider_names'] = configdict['providers'].keys()
configdict['share_provider_names'] = [k for k,v in configdict['providers'].iteritems() if 'share' in v['type']]
 
# if etc/local.yaml exists, we'll load and update
# We'll load from both a global system wide one, and a local directory if they exist.
for _local_path in ['/opt/harbor/etc', os.path.join(_root, 'harbor-creds/systems/prod'), os.path.join(_root, 'etc')]:
    if os.path.exists(os.path.join(_local_path, 'local.yaml')):
        try:
            configdict.update(yaml.load(file(os.path.join(_local_path, 'local.yaml'))))
        except (IOError, TypeError):
            pass
 
# restore origin str yaml handler
yaml.add_constructor(tag, original_str_constructor)
 
if __name__ != '__main__':
    module = imp.new_module(__name__)
    for key, value in configdict.iteritems():
        setattr(module, key, value)
        sys.modules[__name__] = module
    else:
        import pprint
        pprint.pprint(configdict)
