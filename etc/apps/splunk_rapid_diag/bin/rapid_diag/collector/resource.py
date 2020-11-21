from __future__ import absolute_import
import sys
from rapid_diag.session_globals import SessionGlobals

IS_LINUX = sys.platform.startswith('linux')


class Resource(object):
    """Validate and return the Resource object corresponding to the collector.
    Return this class object in `get_required_resources` abstract method of Collector class.
    Allowed resource values are categorized as follows based in OS;
    `Windows`: procmon, procdump, netsh, logman, netstat, tasklist, handle64
    `Linux`: ptrace, tcpdump, iostat, netstat, ps, lsof

    Parameters
    ----------
    name : str
        name of the resource

    process : object
        instance of Process or SeachProcess class

    Raises
    ------
    ValueError
        if resource asked is unknown
        or process is not passed for the resource which requires it
        or process is passed for the resource which does not accept it
    """
    RESOURCE_SET = ('ptrace', 'tcpdump', 'iostat', 'netstat', 'ps', 'lsof') if IS_LINUX else (
        'procmon', 'procdump', 'netsh', 'logman', 'netstat', 'tasklist', 'handle64')
    REQUIRES_PROCESS = ('ptrace', 'lsof') if IS_LINUX else tuple()

    def __init__(self, name, process=None):
        self.name = name
        self.process = process
        self.__validate()
        self.process = SessionGlobals.get_process_lister().get_best_running_match(process)

    def __validate(self):
        """Validate the resource requirements asked by the collector.
        """
        if self.name not in self.RESOURCE_SET:
            raise ValueError(self.name + " is not a valid resource name.")
        if self.process is not None and self.name not in self.REQUIRES_PROCESS:
            raise ValueError("Resource " + self.name +
                             " does not accept process=" + str(self.process))
        if self.name in self.REQUIRES_PROCESS and self.process is None:
            raise ValueError("Resource " + self.name + " requires process.")

    def __repr__(self):
        obj = {"name": self.name}
        if self.process:
            obj["process"] = self.process.toJsonObj()
        return str(obj)

    def __eq__(self, other):
        return self.name == other.name and self.process == other.process

    def __ne__(self, other):
        return (not self.__eq__(other))

    def __hash__(self):
        return hash(self.__repr__())

    def to_json(self):
        """Return the json encoded form of object.

        Returns
        -------
        dict
            jsonified Resource object
        """
        return {self.name: self.process.toJsonObj() if self.process else None}
